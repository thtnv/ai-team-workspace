import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceMemberSchema
from app.schemas.board import BoardResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")
    cursor = workspaces_col.find({"members.user_id": user_id})
    items = await cursor.to_list(100)
    
    # If empty, also return all for demo convenience
    if not items:
        cursor = workspaces_col.find({})
        items = await cursor.to_list(100)

    res = []
    for item in items:
        res.append(WorkspaceResponse(
            id=str(item["_id"]),
            name=item["name"],
            slug=item.get("slug", ""),
            description=item.get("description", ""),
            owner_id=str(item.get("owner_id", user_id)),
            members=[WorkspaceMemberSchema(**m) for m in item.get("members", [])],
            created_at=item.get("created_at", ""),
            updated_at=item.get("updated_at", "")
        ))
    return res


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(req: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")
    boards_col = db_manager.get_collection("boards")

    ws_id = f"ws-{uuid.uuid4().hex[:10]}"
    slug = req.name.lower().replace(" ", "-")[:30]
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": ws_id,
        "name": req.name,
        "slug": slug,
        "description": req.description or "",
        "owner_id": user_id,
        "members": [
            {
                "user_id": user_id,
                "email": current_user["email"],
                "full_name": current_user["full_name"],
                "role": "admin",
                "avatar_url": current_user.get("avatar_url")
            }
        ],
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await workspaces_col.insert_one(doc)

    # Automatically create a default Kanban Board for the workspace
    board_id = f"board-{uuid.uuid4().hex[:10]}"
    board_doc = {
        "_id": board_id,
        "workspace_id": ws_id,
        "title": f"{req.name} - Main Board",
        "description": "Default collaboration kanban board",
        "columns": [
            { "id": "col-todo", "title": "To Do", "order": 0, "color": "#94a3b8" },
            { "id": "col-inprogress", "title": "In Progress", "order": 1, "color": "#38bdf8" },
            { "id": "col-review", "title": "In Review", "order": 2, "color": "#facc15" },
            { "id": "col-done", "title": "Done", "order": 3, "color": "#4ade80" }
        ],
        "created_by": user_id,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    await boards_col.insert_one(board_doc)

    return WorkspaceResponse(
        id=ws_id,
        name=doc["name"],
        slug=doc["slug"],
        description=doc["description"],
        owner_id=doc["owner_id"],
        members=[WorkspaceMemberSchema(**m) for m in doc["members"]],
        created_at=now_iso,
        updated_at=now_iso
    )


@router.get("/{workspace_id}/boards", response_model=List[BoardResponse])
async def get_workspace_boards(workspace_id: str, current_user: dict = Depends(get_current_user)):
    boards_col = db_manager.get_collection("boards")
    cursor = boards_col.find({"workspace_id": workspace_id})
    boards = await cursor.to_list(100)

    res = []
    for b in boards:
        res.append(BoardResponse(
            id=str(b["_id"]),
            workspace_id=b["workspace_id"],
            title=b["title"],
            description=b.get("description", ""),
            columns=b["columns"],
            created_by=str(b.get("created_by", "")),
            created_at=b.get("created_at", ""),
            updated_at=b.get("updated_at", "")
        ))
    return res

