from datetime import date, datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class EmploymentStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    terminated = "terminated"


class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    date_joined: date
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    manager_id: Optional[int] = None
    working_schedule_id: Optional[int] = None
    role_id: int
    employment_status: EmploymentStatus = EmploymentStatus.active
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    manager_id: Optional[int] = None
    working_schedule_id: Optional[int] = None
    employment_status: Optional[EmploymentStatus] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None


class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    date_joined: date
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    manager_id: Optional[int] = None
    working_schedule_id: Optional[int] = None
    role_id: int
    employment_status: EmploymentStatus
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
