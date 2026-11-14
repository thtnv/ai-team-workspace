from typing import Optional
from pydantic import BaseModel
from app.schemas.common import BaseSchema


class NotificationResponse(BaseSchema):
    id: str
    user_id: str
    actor_id: str
    actor_name: str
    actor_avatar: Optional[str] = None
    action_type: str  # "assigned" | "comment" | "status" | "mention" | "ai"
    title: str
    message: str
    task_id: Optional[str] = None
    board_id: Optional[str] = None
    workspace_id: Optional[str] = None
    is_read: bool = False
    created_at: str
