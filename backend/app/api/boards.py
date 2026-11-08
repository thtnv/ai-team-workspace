import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.board import BoardCreate, BoardResponse, BoardColumn
from app.schemas.task import TaskResponse, SubtaskItem, CommentItem
from app.api.auth import get_current_user

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
        columns=columns,
        created_by=user_id,
        created_at=now_iso,
        updated_at=now_iso
    )

