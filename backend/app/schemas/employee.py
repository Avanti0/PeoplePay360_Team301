import re
from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class EmploymentStatus(str, Enum):
    active   = "active"
    inactive = "inactive"
    on_leave = "on_leave"


def validate_phone_number(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    clean = v.strip()
    if not clean:
        return None
    if not re.match(r"^\+?[0-9\s\-().]{7,20}$", clean):
        raise ValueError("Please enter a valid phone number (e.g. +91 9876543210 or 9876543210)")
    digits = re.sub(r"[^0-9]", "", clean)
    if len(digits) < 7 or len(digits) > 15:
        raise ValueError("Phone number must contain between 7 and 15 digits")
    return clean


class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    manager_id: Optional[UUID] = None
    working_schedule_id: Optional[UUID] = None
    user_id: Optional[UUID] = None  # links to an existing login account, if any
    employment_status: EmploymentStatus = EmploymentStatus.active
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    manager_id: Optional[UUID] = None
    working_schedule_id: Optional[UUID] = None
    employment_status: Optional[EmploymentStatus] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)


class EmployeeOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    name: str
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    manager_id: Optional[UUID] = None
    working_schedule_id: Optional[UUID] = None
    working_schedule_name: Optional[str] = None
    employment_status: EmploymentStatus
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeePage(BaseModel):
    items: List[EmployeeOut]
    total: int
    page: int
    limit: int
    total_pages: int
