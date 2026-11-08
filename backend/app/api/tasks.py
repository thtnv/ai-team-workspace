import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.task import TaskCreate, TaskUpdate, TaskMoveRequest, TaskResponse, SubtaskItem
from app.api.auth import get_current_user
from app.sockets.socket_manager import broadcast_board_event

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=TaskResponse)
async def create_task(req: TaskCreate, current_user: dict = Depends(get_current_user)):
    tasks_col = db_manager.get_collection("tasks")
    task_id = f"task-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user["_id"])

    # If no checklist id, generate uuid
    checklists = []
    for c in req.checklists:
        checklists.append({
            "id": c.id or f"chk-{uuid.uuid4().hex[:6]}",
            "title": c.title,
            "is_done": c.is_done
        })

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
        "ai_generated": req.ai_generated,
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await tasks_col.insert_one(doc)

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

    update_fields = {}
    if req.title is not None:
        update_fields["title"] = req.title
    if req.description is not None:
        update_fields["description"] = req.description
    if req.column_id is not None:
        update_fields["column_id"] = req.column_id
    if req.priority is not None:
        update_fields["priority"] = req.priority
    if req.order is not None:
        update_fields["order"] = float(req.order)
    if req.assignees is not None:
        update_fields["assignees"] = req.assignees
    if req.tags is not None:
        update_fields["tags"] = req.tags
    if req.due_date is not None:
        update_fields["due_date"] = req.due_date
    if req.checklists is not None:
        update_fields["checklists"] = [c.model_dump() for c in req.checklists]

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

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

    now_iso = datetime.now(timezone.utc).isoformat()
    await tasks_col.update_one(
        {"_id": req.task_id},
        {
            "$set": {
                "column_id": req.dest_col_id,
                "order": float(req.new_order),
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
            "user_name": current_user.get("full_name", "A member")
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

