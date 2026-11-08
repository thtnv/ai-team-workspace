from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class WorkspaceMemberSchema(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str = "member"  # "admin" | "member" | "viewer"
    avatar_url: Optional[str] = None


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""


class WorkspaceOnboardingCreate(BaseModel):
    workspace_name: str = Field(..., min_length=2, max_length=100)
    board_title: Optional[str] = "Sprint 1 - Khởi động dự án"
    description: Optional[str] = ""


class WorkspaceJoinRequest(BaseModel):
    invite_code: str = Field(..., min_length=2)


class WorkspaceInviteRequest(BaseModel):
    email: str = Field(..., min_length=3)
    role: Optional[str] = "member"


class WorkspaceResponse(BaseSchema):
    id: str
    name: str
    slug: str
    description: Optional[str] = ""
    owner_id: str
    members: List[WorkspaceMemberSchema] = []
    created_at: str
    updated_at: str

