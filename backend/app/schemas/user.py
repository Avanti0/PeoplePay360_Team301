from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.auth import UserRole


class UserCreateAdmin(BaseModel):
    username: str
    password: str
    role: UserRole
    is_active: bool = True
    employee_id: Optional[UUID] = None


class UserUpdateAdmin(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    employee_id: Optional[UUID] = None


class UserDetailOut(BaseModel):
    id: UUID
    username: str
    role: UserRole
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    employee_id: Optional[UUID] = None
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True
