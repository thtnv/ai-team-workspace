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
    WorkspaceUpdate,
    WorkspaceMemberRoleUpdate,
    WorkspaceStatsResponse,
)
from app.schemas.board import BoardResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")
    users_col = db_manager.get_collection("users")

    cursor = workspaces_col.find({"members.user_id": user_id})
    items = await cursor.to_list(100)

    # Auto Self-Healing: Prune any member whose user document was deleted from DB
    all_member_ids = list({
        m.get("user_id")
        for item in items
        for m in item.get("members", [])
        if m.get("user_id") and not str(m.get("user_id", "")).startswith("invited-")
    })

    existing_uids = set()
    if all_member_ids:
        found_users = await users_col.find({"_id": {"$in": all_member_ids}}).to_list(len(all_member_ids))
        existing_uids = {str(u["_id"]) for u in found_users}

    res = []
    for item in items:
        raw_members = item.get("members", [])
        valid_members = [
            m for m in raw_members
            if m.get("user_id") in existing_uids or str(m.get("user_id", "")).startswith("invited-")
        ]

        if len(valid_members) != len(raw_members):
            now_iso = datetime.now(timezone.utc).isoformat()
            await workspaces_col.update_one(
                {"_id": item["_id"]},
                {"$set": {"members": valid_members, "updated_at": now_iso}}
            )
            item["members"] = valid_members

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


@router.post("/{workspace_id}/invite")
async def invite_member(workspace_id: str, req: WorkspaceInviteRequest, current_user: dict = Depends(get_current_user)):
    """Invite a member by email to the current workspace."""
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")
    users_col = db_manager.get_collection("users")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    members = ws.get("members", [])
    caller = next((m for m in members if m.get("user_id") == user_id), None)
    if not caller or (caller.get("role") not in ["admin", "owner"] and str(ws.get("owner_id")) != user_id):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên (Admin) hoặc Trưởng nhóm mới có quyền mời thành viên mới.")

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


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(workspace_id: str, req: WorkspaceUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    members = ws.get("members", [])
    caller = next((m for m in members if m.get("user_id") == user_id), None)
    if not caller or (caller.get("role") not in ["admin", "owner"] and str(ws.get("owner_id")) != user_id):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên (Admin) hoặc Trưởng nhóm mới có quyền chỉnh sửa Không gian.")

    updates = {}
    if req.name is not None and req.name.strip():
        updates["name"] = req.name.strip()
    if req.description is not None:
        updates["description"] = req.description.strip()

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await workspaces_col.update_one({"_id": workspace_id}, {"$set": updates})

    updated_ws = await workspaces_col.find_one({"_id": workspace_id})
    return WorkspaceResponse(
        id=str(updated_ws["_id"]),
        name=updated_ws["name"],
        slug=updated_ws.get("slug", ""),
        description=updated_ws.get("description", ""),
        owner_id=str(updated_ws.get("owner_id", user_id)),
        members=[WorkspaceMemberSchema(**m) for m in updated_ws.get("members", [])],
        created_at=updated_ws.get("created_at", ""),
        updated_at=updated_ws.get("updated_at", "")
    )


@router.put("/{workspace_id}/members/{target_user_id}/role", response_model=WorkspaceResponse)
async def update_member_role(
    workspace_id: str,
    target_user_id: str,
    req: WorkspaceMemberRoleUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    members = ws.get("members", [])
    caller = next((m for m in members if m.get("user_id") == user_id), None)
    if not caller or (caller.get("role") not in ["admin", "owner"] and str(ws.get("owner_id")) != user_id):
        raise HTTPException(status_code=403, detail="Bạn không có quyền thay đổi vai trò thành viên.")

    if target_user_id == str(ws.get("owner_id")) and req.role != "admin":
        raise HTTPException(status_code=400, detail="Không thể hạ quyền của Trưởng nhóm tạo không gian.")

    found = False
    for m in members:
        if m.get("user_id") == target_user_id:
            m["role"] = req.role
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên trong nhóm.")

    now_iso = datetime.now(timezone.utc).isoformat()
    await workspaces_col.update_one(
        {"_id": workspace_id},
        {"$set": {"members": members, "updated_at": now_iso}}
    )

    return WorkspaceResponse(
        id=str(ws["_id"]),
        name=ws["name"],
        slug=ws.get("slug", ""),
        description=ws.get("description", ""),
        owner_id=str(ws.get("owner_id", user_id)),
        members=[WorkspaceMemberSchema(**m) for m in members],
        created_at=ws.get("created_at", ""),
        updated_at=now_iso
    )


@router.delete("/{workspace_id}/members/{target_user_id}", response_model=WorkspaceResponse)
async def remove_member(
    workspace_id: str,
    target_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    members = ws.get("members", [])
    caller = next((m for m in members if m.get("user_id") == user_id), None)

    is_self = user_id == target_user_id
    is_admin = (caller and caller.get("role") in ["admin", "owner"]) or str(ws.get("owner_id")) == user_id

    if not (is_self or is_admin):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa thành viên này.")

    if target_user_id == str(ws.get("owner_id")):
        raise HTTPException(status_code=400, detail="Trưởng nhóm sở hữu không thể rời hoặc bị xóa khỏi Không gian.")

    new_members = [m for m in members if m.get("user_id") != target_user_id]
    if len(new_members) == len(members):
        raise HTTPException(status_code=404, detail="Không tìm thấy thành viên cần xóa.")

    now_iso = datetime.now(timezone.utc).isoformat()
    await workspaces_col.update_one(
        {"_id": workspace_id},
        {"$set": {"members": new_members, "updated_at": now_iso}}
    )

    return WorkspaceResponse(
        id=str(ws["_id"]),
        name=ws["name"],
        slug=ws.get("slug", ""),
        description=ws.get("description", ""),
        owner_id=str(ws.get("owner_id", user_id)),
        members=[WorkspaceMemberSchema(**m) for m in new_members],
        created_at=ws.get("created_at", ""),
        updated_at=now_iso
    )


@router.post("/{workspace_id}/reset-invite-code")
async def reset_invite_code(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    workspaces_col = db_manager.get_collection("workspaces")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    members = ws.get("members", [])
    caller = next((m for m in members if m.get("user_id") == user_id), None)
    if not caller or (caller.get("role") not in ["admin", "owner"] and str(ws.get("owner_id")) != user_id):
        raise HTTPException(status_code=403, detail="Chỉ Quản trị viên mới có thể tạo lại mã mời.")

    new_slug = f"{ws['name'].lower().replace(' ', '-')[:15]}-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    await workspaces_col.update_one(
        {"_id": workspace_id},
        {"$set": {"slug": new_slug, "updated_at": now_iso}}
    )

    return {"message": "Đã tạo mới mã mời thành công!", "new_invite_code": new_slug}


@router.get("/{workspace_id}/stats", response_model=WorkspaceStatsResponse)
async def get_workspace_stats(workspace_id: str, current_user: dict = Depends(get_current_user)):
    workspaces_col = db_manager.get_collection("workspaces")
    boards_col = db_manager.get_collection("boards")
    tasks_col = db_manager.get_collection("tasks")
    notes_col = db_manager.get_collection("notes")

    ws = await workspaces_col.find_one({"_id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian làm việc.")

    boards = await boards_col.find({"workspace_id": workspace_id}).to_list(100)
    board_ids = [str(b["_id"]) for b in boards]

    all_tasks = await tasks_col.find({"board_id": {"$in": board_ids}}).to_list(1000) if board_ids else []
    total_tasks = len(all_tasks)
    completed_tasks = sum(1 for t in all_tasks if t.get("column_id") == "col-done")
    ai_tasks_count = sum(1 for t in all_tasks if any("ai" in str(tag).lower() for tag in t.get("tags", [])))

    notes_count = await notes_col.count_documents({"workspace_id": workspace_id})

    return WorkspaceStatsResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_boards=len(boards),
        total_members=len(ws.get("members", [])),
        total_notes=notes_count,
        ai_tasks_count=ai_tasks_count
    )

