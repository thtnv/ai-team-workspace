from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common import BaseSchema


class BoardColumn(BaseModel):
    id: str
    title: str
    order: int
    color: str = "#64748b"


class BoardCreate(BaseModel):
    workspace_id: str
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""
    columns: Optional[List[BoardColumn]] = None


class BoardResponse(BaseSchema):
    id: str
    workspace_id: str
    title: str
    description: Optional[str] = ""
    columns: List[BoardColumn]
    created_by: str
    created_at: str
    updated_at: str

