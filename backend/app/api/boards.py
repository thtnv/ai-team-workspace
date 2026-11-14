import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.board import BoardCreate, BoardUpdate, BoardColumnsUpdate, BoardResponse, BoardColumn
from app.schemas.task import TaskResponse, SubtaskItem, CommentItem
from app.api.auth import get_current_user
from app.sockets.socket_manager import broadcast_board_event

router = APIRouter(prefix="/boards", tags=["Boards"])


@router.get("/{board_id}", response_model=BoardResponse)
async def get_board(board_id: str, current_user: dict = Depends(get_current_user)):
    boards_col = db_manager.get_collection("boards")
    board = await boards_col.find_one({"_id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    return BoardResponse(
        id=str(board["_id"]),
        workspace_id=board["workspace_id"],
        title=board["title"],
        description=board.get("description", ""),
        start_date=board.get("start_date"),
        end_date=board.get("end_date"),
        columns=board["columns"],
        created_by=str(board.get("created_by", "")),
        created_at=board.get("created_at", ""),
        updated_at=board.get("updated_at", "")
    )


@router.get("/{board_id}/tasks", response_model=List[TaskResponse])
async def get_board_tasks(board_id: str, current_user: dict = Depends(get_current_user)):
    tasks_col = db_manager.get_collection("tasks")
    cursor = tasks_col.find({"board_id": board_id}).sort("order", 1)
    tasks = await cursor.to_list(500)

    res = []
    for t in tasks:
        checklists = [SubtaskItem(**c) for c in t.get("checklists", [])]
        comments = [CommentItem(**c) for c in t.get("comments", [])]
        res.append(TaskResponse(
            id=str(t["_id"]),
            board_id=t["board_id"],
            workspace_id=t.get("workspace_id", ""),
            column_id=t["column_id"],
            title=t["title"],
            description=t.get("description", ""),
            priority=t.get("priority", "medium"),
            order=float(t.get("order", 1000.0)),
            assignees=t.get("assignees", []),
            tags=t.get("tags", []),
            due_date=t.get("due_date"),
            checklists=checklists,
            comments=comments,
            ai_generated=t.get("ai_generated", False),
            created_by=t.get("created_by"),
            created_at=t.get("created_at", ""),
            updated_at=t.get("updated_at", "")
        ))
    return res


@router.post("", response_model=BoardResponse)
async def create_board(req: BoardCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    boards_col = db_manager.get_collection("boards")
    board_id = f"board-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    columns = req.columns or [
        BoardColumn(id="col-todo", title="To Do", order=0, color="#94a3b8"),
        BoardColumn(id="col-inprogress", title="In Progress", order=1, color="#38bdf8"),
        BoardColumn(id="col-review", title="In Review", order=2, color="#facc15"),
        BoardColumn(id="col-done", title="Done", order=3, color="#4ade80")
    ]

    doc = {
        "_id": board_id,
        "workspace_id": req.workspace_id,
        "title": req.title,
        "description": req.description or "",
        "start_date": req.start_date,
        "end_date": req.end_date,
        "columns": [c.model_dump() for c in columns],
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await boards_col.insert_one(doc)

    return BoardResponse(
        id=board_id,
        workspace_id=doc["workspace_id"],
        title=doc["title"],
        description=doc["description"],
        start_date=doc["start_date"],
        end_date=doc["end_date"],
        columns=columns,
        created_by=user_id,
        created_at=now_iso,
        updated_at=now_iso
    )


@router.put("/{board_id}", response_model=BoardResponse)
async def update_board(board_id: str, req: BoardUpdate, current_user: dict = Depends(get_current_user)):
    boards_col = db_manager.get_collection("boards")
    board = await boards_col.find_one({"_id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    updates = {}
    if req.title is not None and req.title.strip():
        updates["title"] = req.title.strip()
    if req.description is not None:
        updates["description"] = req.description.strip()
    if req.start_date is not None:
        updates["start_date"] = req.start_date
    if req.end_date is not None:
        updates["end_date"] = req.end_date

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await boards_col.update_one({"_id": board_id}, {"$set": updates})
    updated = await boards_col.find_one({"_id": board_id})

    return BoardResponse(
        id=str(updated["_id"]),
        workspace_id=updated["workspace_id"],
        title=updated["title"],
        description=updated.get("description", ""),
        start_date=updated.get("start_date"),
        end_date=updated.get("end_date"),
        columns=updated["columns"],
        created_by=str(updated.get("created_by", "")),
        created_at=updated.get("created_at", ""),
        updated_at=updated.get("updated_at", "")
    )


@router.put("/{board_id}/columns", response_model=BoardResponse)
async def update_board_columns(board_id: str, req: BoardColumnsUpdate, current_user: dict = Depends(get_current_user)):
    boards_col = db_manager.get_collection("boards")
    board = await boards_col.find_one({"_id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    columns_data = [c.model_dump() for c in req.columns]

    await boards_col.update_one(
        {"_id": board_id},
        {"$set": {"columns": columns_data, "updated_at": now_iso}}
    )

    # Broadcast event to other members viewing this board
    await broadcast_board_event(board_id, "columns_updated", {"columns": columns_data})

    updated = await boards_col.find_one({"_id": board_id})
    return BoardResponse(
        id=str(updated["_id"]),
        workspace_id=updated["workspace_id"],
        title=updated["title"],
        description=updated.get("description", ""),
        start_date=updated.get("start_date"),
        end_date=updated.get("end_date"),
        columns=updated["columns"],
        created_by=str(updated.get("created_by", "")),
        created_at=updated.get("created_at", ""),
        updated_at=updated.get("updated_at", "")
    )


@router.delete("/{board_id}")
async def delete_board(board_id: str, current_user: dict = Depends(get_current_user)):
    boards_col = db_manager.get_collection("boards")
    tasks_col = db_manager.get_collection("tasks")
    board = await boards_col.find_one({"_id": board_id})
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    # Check if this is the only board in the workspace
    workspace_id = board["workspace_id"]
    count = await boards_col.count_documents({"workspace_id": workspace_id})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Không thể xóa Sprint/Bảng duy nhất của không gian làm việc.")

    await boards_col.delete_one({"_id": board_id})
    # Clean up tasks on this board
    await tasks_col.delete_many({"board_id": board_id})

    return {"message": "Đã xóa Sprint thành công", "deleted_board_id": board_id}


