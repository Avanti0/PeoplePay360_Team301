from pydantic import BaseModel, EmailStr
from enum import Enum

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
    email: EmailStr
    password: str
    role: UserRole

class UserOut(BaseModel):
    id: str
    email: EmailStr
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True
