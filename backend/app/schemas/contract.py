from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class EmploymentType(str, Enum):
    permanent = "permanent"
    contract = "contract"
    intern = "intern"


class ContractStatus(str, Enum):
    draft = "draft"
    running = "running"
    expired = "expired"
    cancelled = "cancelled"


class ContractCreate(BaseModel):
    employee_id: int
    start_date: date
    end_date: Optional[date] = None
    wage: Decimal
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    working_schedule_id: Optional[int] = None
    salary_structure_id: Optional[int] = None
    employment_type: EmploymentType = EmploymentType.permanent
    status: ContractStatus = ContractStatus.draft

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("start_date")
        if v is not None and start is not None and v < start:
            raise ValueError("end_date must be on or after start_date")
        return v

    @field_validator("wage")
    @classmethod
    def wage_non_negative(cls, v):
        if v < 0:
            raise ValueError("wage must be >= 0")
        return v


class ContractUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    wage: Optional[Decimal] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    working_schedule_id: Optional[int] = None
    salary_structure_id: Optional[int] = None
    employment_type: Optional[EmploymentType] = None
    status: Optional[ContractStatus] = None

    @field_validator("wage")
    @classmethod
    def wage_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("wage must be >= 0")
        return v


class ContractOut(BaseModel):
    id: int
    employee_id: int
    start_date: date
    end_date: Optional[date] = None
    wage: Decimal
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    working_schedule_id: Optional[int] = None
    salary_structure_id: Optional[int] = None
    employment_type: EmploymentType
    status: ContractStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
