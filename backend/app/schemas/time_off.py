from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class TimeOffUnit(str, Enum):
    days  = "days"
    hours = "hours"


class AllocationStatus(str, Enum):
    draft    = "draft"
    approved = "approved"
    refused  = "refused"


class TimeOffRequestStatus(str, Enum):
    draft     = "draft"
    submitted = "submitted"
    approved  = "approved"
    refused   = "refused"
    cancelled = "cancelled"


# --- Time Off Types ---

class TimeOffTypeCreate(BaseModel):
    name: str
    unit: TimeOffUnit = TimeOffUnit.days
    requires_allocation: bool = True
    affects_payroll: bool = True
    is_active: bool = True


class TimeOffTypeUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[TimeOffUnit] = None
    requires_allocation: Optional[bool] = None
    affects_payroll: Optional[bool] = None
    is_active: Optional[bool] = None


class TimeOffTypeOut(BaseModel):
    id: int
    name: str
    unit: TimeOffUnit
    requires_allocation: bool
    affects_payroll: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# --- Leave Allocations ---

class LeaveAllocationCreate(BaseModel):
    employee_id: int
    time_off_type_id: int
    allocated_amount: Decimal
    valid_from: date
    valid_to: Optional[date] = None
    status: AllocationStatus = AllocationStatus.draft

    @field_validator("allocated_amount")
    @classmethod
    def amount_non_negative(cls, v):
        if v < 0:
            raise ValueError("allocated_amount must be >= 0")
        return v

    @field_validator("valid_to")
    @classmethod
    def valid_to_after_from(cls, v, info):
        start = info.data.get("valid_from")
        if v is not None and start is not None and v < start:
            raise ValueError("valid_to must be on or after valid_from")
        return v


class LeaveAllocationUpdate(BaseModel):
    allocated_amount: Optional[Decimal] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    status: Optional[AllocationStatus] = None


class LeaveAllocationOut(BaseModel):
    id: int
    employee_id: int
    time_off_type_id: int
    allocated_amount: Decimal
    taken_amount: Decimal
    valid_from: date
    valid_to: Optional[date] = None
    status: AllocationStatus
    approved_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Time Off Requests ---

class TimeOffRequestCreate(BaseModel):
    employee_id: int
    time_off_type_id: int
    start_date: date
    end_date: date
    duration: Decimal
    reason: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("start_date")
        if start is not None and v < start:
            raise ValueError("end_date must be on or after start_date")
        return v

    @field_validator("duration")
    @classmethod
    def duration_positive(cls, v):
        if v <= 0:
            raise ValueError("duration must be > 0")
        return v


class TimeOffRequestUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration: Optional[Decimal] = None
    reason: Optional[str] = None
    status: Optional[TimeOffRequestStatus] = None


class TimeOffRequestOut(BaseModel):
    id: int
    employee_id: int
    time_off_type_id: int
    allocation_id: Optional[int] = None
    start_date: date
    end_date: date
    duration: Decimal
    status: TimeOffRequestStatus
    reason: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
