import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.db.mongodb import db_manager
from app.schemas.notification import NotificationResponse
from app.api.auth import get_current_user
from app.sockets.socket_manager import broadcast_board_event

router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def create_notification_internal(
    user_id: str,
    actor_id: str,
    actor_name: str,
    actor_avatar: Optional[str],
    action_type: str,
    title: str,
    message: str,
    task_id: Optional[str] = None,
    board_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
):
    """Helper to create and emit in-app notifications to a user."""
    # Do not notify user about their own actions
    if user_id == actor_id:
        return None

    notifications_col = db_manager.get_collection("notifications")
    notif_id = f"notif-{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    doc = {
        "_id": notif_id,
        "user_id": user_id,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "actor_avatar": actor_avatar,
        "action_type": action_type,
        "title": title,
        "message": message,
        "task_id": task_id,
        "board_id": board_id,
        "workspace_id": workspace_id,
        "is_read": False,
        "created_at": now_iso,
    }
    await notifications_col.insert_one(doc)

    # Broadcast event if board_id provided
    if board_id:
        await broadcast_board_event(board_id, "notification_received", {
            "user_id": user_id,
            "notification": {**doc, "id": notif_id}
        })

    return doc


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    notifications_col = db_manager.get_collection("notifications")
    cursor = notifications_col.find({"user_id": user_id}).sort("created_at", -1)
    items = await cursor.to_list(50)

    res = []
    for item in items:
        res.append(NotificationResponse(
            id=str(item["_id"]),
            user_id=item["user_id"],
            actor_id=item.get("actor_id", ""),
            actor_name=item.get("actor_name", "System"),
            actor_avatar=item.get("actor_avatar"),
            action_type=item.get("action_type", "assigned"),
            title=item.get("title", ""),
            message=item.get("message", ""),
            task_id=item.get("task_id"),
            board_id=item.get("board_id"),
            workspace_id=item.get("workspace_id"),
            is_read=item.get("is_read", False),
            created_at=item.get("created_at", "")
        ))
    return res


@router.put("/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    notifications_col = db_manager.get_collection("notifications")
    await notifications_col.update_one(
        {"_id": notif_id, "user_id": user_id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Đã đánh dấu là đã đọc", "id": notif_id}


@router.put("/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    notifications_col = db_manager.get_collection("notifications")
    await notifications_col.update_many(
        {"user_id": user_id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Đã đánh dấu tất cả là đã đọc"}
