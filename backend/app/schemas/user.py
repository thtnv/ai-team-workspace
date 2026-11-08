from typing import Optional
from pydantic import BaseModel, EmailStr
from app.schemas.common import BaseSchema


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseSchema):
    id: str
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

