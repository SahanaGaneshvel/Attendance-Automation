from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ScopeInfo(BaseModel):
    """User's scope information based on role."""
    section_id: Optional[int] = None
    section_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    school_id: Optional[int] = None
    school_name: Optional[str] = None


class UserResponse(BaseModel):
    """Current user info returned by /auth/me."""
    id: int
    name: str
    email: str
    role: str
    scope: ScopeInfo

    class Config:
        from_attributes = True