from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator


class ContractStatus(str, Enum):
    draft     = "draft"
    active    = "active"
    expired   = "expired"
    cancelled = "cancelled"


class ContractCreate(BaseModel):
    employee_id: UUID
    date_start: date
    date_end: Optional[date] = None
    wage: Decimal
    department: Optional[str] = None
    job_position: Optional[str] = None
    working_schedule_id: Optional[UUID] = None
    salary_structure_id: Optional[UUID] = None
    status: ContractStatus = ContractStatus.draft

    @field_validator("date_end")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("date_start")
        if v is not None and start is not None and v < start:
            raise ValueError("date_end must be on or after date_start")
        return v

    @field_validator("wage")
    @classmethod
    def wage_non_negative(cls, v):
        if v < 0:
            raise ValueError("wage must be >= 0")
        return v


class ContractUpdate(BaseModel):
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    wage: Optional[Decimal] = None
    department: Optional[str] = None
    job_position: Optional[str] = None
    working_schedule_id: Optional[UUID] = None
    salary_structure_id: Optional[UUID] = None
    status: Optional[ContractStatus] = None

    @field_validator("wage")
    @classmethod
    def wage_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("wage must be >= 0")
        return v


class ContractOut(BaseModel):
    id: UUID
    employee_id: UUID
    date_start: date
    date_end: Optional[date] = None
    wage: Decimal
    department: Optional[str] = None
    job_position: Optional[str] = None
    working_schedule_id: Optional[UUID] = None
    salary_structure_id: Optional[UUID] = None
    status: ContractStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
