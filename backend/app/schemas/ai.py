from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.note import ActionItem


class ChecklistDraft(BaseModel):
    title: str = Field(..., description="Checklist item description")


class TaskDraft(BaseModel):
    title: str = Field(..., description="Clear and concise task title")
    description: str = Field(..., description="Detailed explanation and acceptance criteria")
    priority: str = Field(..., description="One of: low, medium, high, urgent")
    estimated_hours: int = Field(default=4, description="Estimated effort in hours")
    tags: List[str] = Field(default=[], description="Suggested tags e.g. frontend, backend, security")
    checklists: List[ChecklistDraft] = Field(default=[], description="Step by step checklist items")


class TaskBreakdownRequest(BaseModel):
    prompt: str = Field(..., min_length=3, description="User feature request or epic description")
    workspace_id: Optional[str] = None
    board_id: Optional[str] = None
    column_id: Optional[str] = None


class TaskBreakdownResponse(BaseModel):
    summary: str = Field(..., description="High-level engineering breakdown summary")
    tasks: List[TaskDraft] = Field(..., description="List of 4-6 breakdown subtasks")


class MeetingSummarizeRequest(BaseModel):
    raw_content: str = Field(..., min_length=10, description="Raw meeting transcript or notes")
    workspace_id: Optional[str] = None
    note_id: Optional[str] = None


class MeetingSummarizeResponse(BaseModel):
    overview: str = Field(..., description="TL;DR summary of meeting")
    key_decisions: List[str] = Field(..., description="Key technical and product decisions made")
    action_items: List[ActionItem] = Field(..., description="Actionable items extracted with assignees")


class ConvertActionToTaskRequest(BaseModel):
    workspace_id: str
    board_id: str
    column_id: str
    action_item: ActionItem

