from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class ActionItem(BaseModel):
    id: str
    action: str
    assignee_name: Optional[str] = "Unassigned"
    suggested_priority: str = "medium"  # "low" | "medium" | "high" | "urgent"
    is_converted_to_task: bool = False
    task_id: Optional[str] = None


class NoteSummary(BaseModel):
    overview: str
    key_decisions: List[str] = []
    action_items: List[ActionItem] = []


class NoteCreate(BaseModel):
    workspace_id: str
    title: str = Field(..., min_length=1, max_length=200)
    raw_content: str = Field(..., min_length=1)


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    raw_content: Optional[str] = None
    summary: Optional[NoteSummary] = None


class NoteResponse(BaseSchema):
    id: str
    workspace_id: str
    title: str
    raw_content: str
    summary: Optional[NoteSummary] = None
    created_by: Optional[str] = None
    created_at: str
    updated_at: str

