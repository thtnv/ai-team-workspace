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


class SocialLoginRequest(BaseModel):
    provider: str  # "google" | "github" | "sso"
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    credential: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    code: Optional[str] = None
    redirect_uri: Optional[str] = None


class GitHubAuthRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class OAuthConfigResponse(BaseModel):
    google_client_id: str
    github_client_id: str
    google_enabled: bool
    github_enabled: bool


class SaveOAuthConfigRequest(BaseModel):
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None


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

