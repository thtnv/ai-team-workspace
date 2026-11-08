import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.mongodb import db_manager
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceMemberSchema,
    WorkspaceOnboardingCreate,
    WorkspaceJoinRequest,
    WorkspaceInviteRequest,
)
from app.schemas.board import BoardResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")
    cursor = workspaces_col.find({"members.user_id": user_id})
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


@router.post("/onboarding", response_model=WorkspaceResponse)
async def create_onboarding_workspace(req: WorkspaceOnboardingCreate, current_user: dict = Depends(get_current_user)):
    """Leader onboarding: creates new team workspace and an initial board."""
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")
    boards_col = db_manager.get_collection("boards")

    ws_id = f"ws-{uuid.uuid4().hex[:10]}"
    clean_name = req.workspace_name.strip()
    slug = clean_name.lower().replace(" ", "-")[:30]
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": ws_id,
        "name": clean_name,
        "slug": slug,
        "description": req.description or f"Không gian làm việc của {clean_name}",
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

    # Auto create initial Board
    board_title = req.board_title.strip() if req.board_title and req.board_title.strip() else "Sprint 1 - Khởi động dự án"
    board_id = f"board-{uuid.uuid4().hex[:10]}"
    board_doc = {
        "_id": board_id,
        "workspace_id": ws_id,
        "title": board_title,
        "description": f"Bảng làm việc chính của nhóm {clean_name}",
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


@router.post("/join", response_model=WorkspaceResponse)
async def join_workspace(req: WorkspaceJoinRequest, current_user: dict = Depends(get_current_user)):
    """Member joins an existing workspace using workspace id or slug/invite code."""
    user_id = str(current_user["_id"])
    code = req.invite_code.strip()
    workspaces_col = db_manager.get_collection("workspaces")

    ws = await workspaces_col.find_one({"$or": [{"_id": code}, {"slug": code.lower()}]})
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy không gian làm việc với mã mời '{code}'."
        )

    members = ws.get("members", [])
    if not any(m.get("user_id") == user_id for m in members):
        new_member = {
            "user_id": user_id,
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "role": "member",
            "avatar_url": current_user.get("avatar_url")
        }
        members.append(new_member)
        await workspaces_col.update_one(
            {"_id": ws["_id"]},
            {"$set": {"members": members, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        ws["members"] = members

    return WorkspaceResponse(
        id=str(ws["_id"]),
        name=ws["name"],
        slug=ws.get("slug", ""),
        description=ws.get("description", ""),
        owner_id=str(ws.get("owner_id", user_id)),
        members=[WorkspaceMemberSchema(**m) for m in ws.get("members", [])],
        created_at=ws.get("created_at", ""),
        updated_at=ws.get("updated_at", "")
    )


@router.post("/join-demo", response_model=WorkspaceResponse)
async def join_demo_workspace(current_user: dict = Depends(get_current_user)):
    """Quick demo join for reviewers/interviewers to explore pre-seeded data."""
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")

    ws = await workspaces_col.find_one({"_id": "ws-acme-eng"})
    if not ws:
        ws = await workspaces_col.find_one({})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu mẫu.")

    members = ws.get("members", [])
    if not any(m.get("user_id") == user_id for m in members):
        new_member = {
            "user_id": user_id,
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "role": "member",
            "avatar_url": current_user.get("avatar_url")
        }
        members.append(new_member)
        await workspaces_col.update_one(
            {"_id": ws["_id"]},
            {"$set": {"members": members, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        ws["members"] = members

    return WorkspaceResponse(
        id=str(ws["_id"]),
        name=ws["name"],
        slug=ws.get("slug", ""),
        description=ws.get("description", ""),
        owner_id=str(ws.get("owner_id", user_id)),
        members=[WorkspaceMemberSchema(**m) for m in ws.get("members", [])],
        created_at=ws.get("created_at", ""),
        updated_at=ws.get("updated_at", "")
    )


@router.post("/{workspace_id}/invite")
async def invite_member(workspace_id: str, req: WorkspaceInviteRequest, current_user: dict = Depends(get_current_user)):
    """Invite a member by email to the current workspace."""
    workspaces_col = db_manager.get_collection("workspaces")
    users_col = db_manager.get_collection("users")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    target_email = req.email.strip().lower()
    target_user = await users_col.find_one({"email": target_email})
    members = ws.get("members", [])

    if target_user:
        target_uid = str(target_user["_id"])
        if any(m.get("user_id") == target_uid for m in members):
            return {"message": f"{target_email} đã có sẵn trong nhóm rồi.", "members": members}
        new_m = {
            "user_id": target_uid,
            "email": target_user["email"],
            "full_name": target_user["full_name"],
            "role": req.role or "member",
            "avatar_url": target_user.get("avatar_url")
        }
    else:
        if any(m.get("email") == target_email for m in members):
            return {"message": f"Email {target_email} đã được mời trước đó.", "members": members}
        new_m = {
            "user_id": f"invited-{uuid.uuid4().hex[:8]}",
            "email": target_email,
            "full_name": target_email.split("@")[0],
            "role": req.role or "member",
            "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed={target_email}"
        }

    members.append(new_m)
    now_iso = datetime.now(timezone.utc).isoformat()
    await workspaces_col.update_one(
        {"_id": workspace_id},
        {"$set": {"members": members, "updated_at": now_iso}}
    )

    return {
        "message": f"Đã thêm thành viên {target_email} vào nhóm thành công!",
        "workspace_id": workspace_id,
        "members": members
    }


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

