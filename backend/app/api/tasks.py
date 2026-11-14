import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskMoveRequest,
    TaskResponse,
    SubtaskItem,
    CommentItem,
    CommentCreate,
    AttachmentItem,
    ActivityItem,
)
from app.api.auth import get_current_user
from app.api.notifications import create_notification_internal
from app.sockets.socket_manager import broadcast_board_event

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse)
async def create_task(req: TaskCreate, current_user: dict = Depends(get_current_user)):
    tasks_col = db_manager.get_collection("tasks")
    task_id = f"task-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user["_id"])
    user_name = current_user.get("full_name") or current_user.get("email", "Member")

    # If no checklist id, generate uuid
    checklists = []
    for c in req.checklists:
        checklists.append({
            "id": c.id or f"chk-{uuid.uuid4().hex[:6]}",
            "title": c.title,
            "is_done": c.is_done
        })

    attachments = [a.model_dump() for a in (req.attachments or [])]
    initial_activity = [{
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "user_name": user_name,
        "action": "created",
        "detail": f"Đã tạo thẻ việc: {req.title}",
        "created_at": now_iso
    }]

    doc = {
        "_id": task_id,
        "board_id": req.board_id,
        "workspace_id": req.workspace_id,
        "column_id": req.column_id,
        "title": req.title,
        "description": req.description or "",
        "priority": req.priority,
        "order": float(req.order or 1000.0),
        "assignees": req.assignees or [user_id],
        "tags": req.tags or [],
        "due_date": req.due_date,
        "checklists": checklists,
        "comments": [],
        "attachments": attachments,
        "activity_log": initial_activity,
        "story_points": req.story_points,
        "ai_generated": req.ai_generated,
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await tasks_col.insert_one(doc)

    # Notify assignees if assigned by another person
    for assignee_id in doc["assignees"]:
        if assignee_id != user_id:
            await create_notification_internal(
                user_id=assignee_id,
                actor_id=user_id,
                actor_name=user_name,
                actor_avatar=current_user.get("avatar_url"),
                action_type="assigned",
                title="Được phân công thẻ việc mới",
                message=f"{user_name} đã gán thẻ việc '{req.title}' cho bạn.",
                task_id=task_id,
                board_id=req.board_id,
                workspace_id=req.workspace_id
            )

    res = TaskResponse(
        id=task_id,
        board_id=doc["board_id"],
        workspace_id=doc["workspace_id"],
        column_id=doc["column_id"],
        title=doc["title"],
        description=doc["description"],
        priority=doc["priority"],
        order=doc["order"],
        assignees=doc["assignees"],
        tags=doc["tags"],
        due_date=doc["due_date"],
        checklists=[SubtaskItem(**c) for c in doc["checklists"]],
        comments=[],
        attachments=[AttachmentItem(**a) for a in doc["attachments"]],
        activity_log=[ActivityItem(**act) for act in doc["activity_log"]],
        story_points=doc["story_points"],
        ai_generated=doc["ai_generated"],
        created_by=user_id,
        created_at=now_iso,
        updated_at=now_iso
    )

    # Real-time Broadcast: Notify all members viewing this board
    await broadcast_board_event(
        board_id=req.board_id,
        event_name="task:created",
        payload={"task": res.model_dump()}
    )

    return res


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, req: TaskUpdate, current_user: dict = Depends(get_current_user)):
    tasks_col = db_manager.get_collection("tasks")
    task = await tasks_col.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = str(current_user["_id"])
    user_name = current_user.get("full_name") or current_user.get("email", "Member")
    now_iso = datetime.now(timezone.utc).isoformat()

    update_fields = {}
    activity_items = list(task.get("activity_log", []))

    if req.title is not None and req.title != task.get("title"):
        update_fields["title"] = req.title
        activity_items.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "user_name": user_name,
            "action": "title_changed",
            "detail": f"Đổi tiêu đề thành: {req.title}",
            "created_at": now_iso
        })

    if req.description is not None:
        update_fields["description"] = req.description

    if req.column_id is not None and req.column_id != task.get("column_id"):
        update_fields["column_id"] = req.column_id
        activity_items.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "user_name": user_name,
            "action": "status_changed",
            "detail": f"Chuyển trạng thái sang cột {req.column_id}",
            "created_at": now_iso
        })

    if req.priority is not None and req.priority != task.get("priority"):
        update_fields["priority"] = req.priority
        activity_items.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "user_name": user_name,
            "action": "priority_changed",
            "detail": f"Đổi độ ưu tiên thành {req.priority}",
            "created_at": now_iso
        })

    if req.order is not None:
        update_fields["order"] = float(req.order)

    if req.assignees is not None:
        old_assignees = set(task.get("assignees", []))
        new_assignees = set(req.assignees)
        added_assignees = new_assignees - old_assignees
        update_fields["assignees"] = req.assignees
        if added_assignees:
            activity_items.append({
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "user_id": user_id,
                "user_name": user_name,
                "action": "assigned",
                "detail": "Cập nhật người phụ trách",
                "created_at": now_iso
            })
            for new_uid in added_assignees:
                if new_uid != user_id:
                    await create_notification_internal(
                        user_id=new_uid,
                        actor_id=user_id,
                        actor_name=user_name,
                        actor_avatar=current_user.get("avatar_url"),
                        action_type="assigned",
                        title="Bạn được gán vào thẻ việc",
                        message=f"{user_name} đã gán thẻ việc '{task.get('title')}' cho bạn.",
                        task_id=task_id,
                        board_id=task.get("board_id"),
                        workspace_id=task.get("workspace_id")
                    )

    if req.tags is not None:
        update_fields["tags"] = req.tags
    if req.due_date is not None:
        update_fields["due_date"] = req.due_date
    if req.checklists is not None:
        update_fields["checklists"] = [c.model_dump() for c in req.checklists]
    if req.attachments is not None:
        update_fields["attachments"] = [a.model_dump() for a in req.attachments]
    if req.story_points is not None:
        update_fields["story_points"] = req.story_points

    update_fields["activity_log"] = activity_items
    update_fields["updated_at"] = now_iso

    await tasks_col.update_one({"_id": task_id}, {"$set": update_fields})
    updated_doc = await tasks_col.find_one({"_id": task_id})

    res = TaskResponse(
        id=str(updated_doc["_id"]),
        board_id=updated_doc["board_id"],
        workspace_id=updated_doc.get("workspace_id", ""),
        column_id=updated_doc["column_id"],
        title=updated_doc["title"],
        description=updated_doc.get("description", ""),
        priority=updated_doc.get("priority", "medium"),
        order=float(updated_doc.get("order", 1000.0)),
        assignees=updated_doc.get("assignees", []),
        tags=updated_doc.get("tags", []),
        due_date=updated_doc.get("due_date"),
        checklists=[SubtaskItem(**c) for c in updated_doc.get("checklists", [])],
        comments=[CommentItem(**c) for c in updated_doc.get("comments", [])],
        attachments=[AttachmentItem(**a) for a in updated_doc.get("attachments", [])],
        activity_log=[ActivityItem(**act) for act in updated_doc.get("activity_log", [])],
        story_points=updated_doc.get("story_points"),
        ai_generated=updated_doc.get("ai_generated", False),
        created_by=updated_doc.get("created_by"),
        created_at=updated_doc.get("created_at", ""),
        updated_at=updated_doc.get("updated_at", "")
    )

    # Broadcast update event
    await broadcast_board_event(
        board_id=updated_doc["board_id"],
        event_name="task:updated",
        payload={"task": res.model_dump()}
    )

    return res


@router.post("/move")
async def move_task(req: TaskMoveRequest, current_user: dict = Depends(get_current_user)):
    tasks_col = db_manager.get_collection("tasks")
    task = await tasks_col.find_one({"_id": req.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = str(current_user["_id"])
    user_name = current_user.get("full_name", "A member")
    now_iso = datetime.now(timezone.utc).isoformat()

    activity_items = list(task.get("activity_log", []))
    if req.dest_col_id != task.get("column_id"):
        activity_items.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "user_name": user_name,
            "action": "column_moved",
            "detail": f"Di chuyển sang cột {req.dest_col_id}",
            "created_at": now_iso
        })

    await tasks_col.update_one(
        {"_id": req.task_id},
        {
            "$set": {
                "column_id": req.dest_col_id,
                "order": float(req.new_order),
                "activity_log": activity_items,
                "updated_at": now_iso
            }
        }
    )

    # Broadcast task:moved event to other clients
    await broadcast_board_event(
        board_id=req.board_id,
        event_name="task:moved",
        payload={
            "task_id": req.task_id,
            "board_id": req.board_id,
            "source_col_id": req.source_col_id,
            "dest_col_id": req.dest_col_id,
            "new_order": float(req.new_order),
            "user_name": user_name
        }
    )

    return {"status": "success", "task_id": req.task_id, "new_column": req.dest_col_id, "order": req.new_order}


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    tasks_col = db_manager.get_collection("tasks")
    task = await tasks_col.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    board_id = task["board_id"]
    await tasks_col.delete_one({"_id": task_id})

    # Broadcast deletion
    await broadcast_board_event(
        board_id=board_id,
        event_name="task:deleted",
        payload={"task_id": task_id, "board_id": board_id}
    )

    return {"status": "deleted", "task_id": task_id}


@router.post("/{task_id}/comments", response_model=CommentItem)
async def add_task_comment(
    task_id: str,
    req: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    tasks_col = db_manager.get_collection("tasks")
    task = await tasks_col.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    user_id = str(current_user["_id"])
    user_name = current_user.get("full_name") or current_user.get("email", "Member")
    user_email = current_user.get("email")
    user_avatar = current_user.get("avatar_url")
    now_iso = datetime.now(timezone.utc).isoformat()
    comment_id = f"cmt-{uuid.uuid4().hex[:10]}"

    comment_doc = {
        "id": comment_id,
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "user_avatar": user_avatar,
        "content": req.content.strip(),
        "created_at": now_iso
    }

    # Record activity
    activity_items = list(task.get("activity_log", []))
    activity_items.append({
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "user_name": user_name,
        "action": "comment_added",
        "detail": f"Đã gửi bình luận: {req.content.strip()[:40]}...",
        "created_at": now_iso
    })

    await tasks_col.update_one(
        {"_id": task_id},
        {
            "$push": {"comments": comment_doc},
            "$set": {"activity_log": activity_items, "updated_at": now_iso}
        }
    )

    # Notify assignees about comment
    for assignee_id in task.get("assignees", []):
        if assignee_id != user_id:
            await create_notification_internal(
                user_id=assignee_id,
                actor_id=user_id,
                actor_name=user_name,
                actor_avatar=user_avatar,
                action_type="comment",
                title=f"Bình luận mới trên '{task.get('title')}'",
                message=f"{user_name}: {req.content.strip()[:60]}",
                task_id=task_id,
                board_id=task.get("board_id"),
                workspace_id=task.get("workspace_id")
            )

    # Broadcast real-time comment to all members watching this board
    board_id = task["board_id"]
    await broadcast_board_event(
        board_id=board_id,
        event_name="task:comment_added",
        payload={
            "task_id": task_id,
            "board_id": board_id,
            "comment": comment_doc
        }
    )

    return CommentItem(**comment_doc)


@router.get("/{task_id}/comments", response_model=List[CommentItem])
async def get_task_comments(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    tasks_col = db_manager.get_collection("tasks")
    task = await tasks_col.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    raw_comments = task.get("comments", [])
    return [CommentItem(**c) for c in raw_comments]



@router.get("/{task_id}/comments", response_model=List[CommentItem])
async def get_task_comments(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    tasks_col = db_manager.get_collection("tasks")
    task = await tasks_col.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    raw_comments = task.get("comments", [])
    return [CommentItem(**c) for c in raw_comments]


