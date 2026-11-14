from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class SubtaskItem(BaseModel):
    id: str
    title: str
    is_done: bool = False


class CommentItem(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: Optional[str] = None
    user_avatar: Optional[str] = None
    content: str
    created_at: str


class AttachmentItem(BaseModel):
    id: str
    name: str
    url: str
    file_type: str = "image"
    size: Optional[int] = None
    created_at: str


class ActivityItem(BaseModel):
    id: str
    user_id: str
    user_name: str
    action: str
    detail: str
    created_at: str


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=3000)


class TaskCreate(BaseModel):
    board_id: str
    workspace_id: str
    column_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    priority: str = "medium"  # "low" | "medium" | "high" | "urgent"
    order: Optional[float] = 1000.0
    assignees: List[str] = []
    tags: List[str] = []
    due_date: Optional[str] = None
    checklists: List[SubtaskItem] = []
    attachments: Optional[List[AttachmentItem]] = []
    story_points: Optional[int] = None
    ai_generated: bool = False


class TaskUpdate(BaseModel):
    column_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    order: Optional[float] = None
    assignees: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    due_date: Optional[str] = None
    checklists: Optional[List[SubtaskItem]] = None
    attachments: Optional[List[AttachmentItem]] = None
    activity_log: Optional[List[ActivityItem]] = None
    story_points: Optional[int] = None


class TaskMoveRequest(BaseModel):
    task_id: str
    board_id: str
    source_col_id: str
    dest_col_id: str
    new_order: float


class TaskResponse(BaseSchema):
    id: str
    board_id: str
    workspace_id: str
    column_id: str
    title: str
    description: Optional[str] = ""
    priority: str
    order: float
    assignees: List[str] = []
    tags: List[str] = []
    due_date: Optional[str] = None
    checklists: List[SubtaskItem] = []
    comments: List[CommentItem] = []
    attachments: List[AttachmentItem] = []
    activity_log: List[ActivityItem] = []
    story_points: Optional[int] = None
    ai_generated: bool = False
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


