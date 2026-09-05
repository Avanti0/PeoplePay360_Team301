from pydantic import BaseModel
from enum import Enum
from typing import Optional
from uuid import UUID

class UserRole(str, Enum):
    employee             = "employee"
    hr_manager           = "hr_manager"
    hr_payroll_user      = "hr_payroll_user"
    hr_payroll_manager   = "hr_payroll_manager"
    admin                = "admin"

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    employee_id: Optional[UUID] = None  # existing employee to link this account to

class UserOut(BaseModel):
    id: UUID
    username: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True
