from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, field_validator


class TimeOffUnit(str, Enum):
    days  = "days"
    hours = "hours"


class AllocationStatus(str, Enum):
    draft     = "draft"
    confirmed = "confirmed"
    approved  = "approved"
    refused   = "refused"


class TimeOffRequestStatus(str, Enum):
    draft     = "draft"
    confirmed = "confirmed"
    approved  = "approved"
    refused   = "refused"


# --- Time Off Types ---

class TimeOffTypeCreate(BaseModel):
    name: str
    unit: TimeOffUnit = TimeOffUnit.days
    requires_allocation: bool = True
    approval_required: bool = True
    is_active: bool = True


class TimeOffTypeUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[TimeOffUnit] = None
    requires_allocation: Optional[bool] = None
    approval_required: Optional[bool] = None
    is_active: Optional[bool] = None


class TimeOffTypeOut(BaseModel):
    id: UUID
    name: str
    unit: TimeOffUnit
    requires_allocation: bool
    approval_required: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# --- Allocations ---

class AllocationCreate(BaseModel):
    employee_id: UUID
    time_off_type_id: UUID
    number_of_days: Decimal
    date_from: date
    date_to: Optional[date] = None
    status: AllocationStatus = AllocationStatus.draft

    @field_validator("number_of_days")
    @classmethod
    def amount_non_negative(cls, v):
        if v < 0:
            raise ValueError("number_of_days must be >= 0")
        return v

    @field_validator("date_to")
    @classmethod
    def date_to_after_from(cls, v, info):
        start = info.data.get("date_from")
        if v is not None and start is not None and v < start:
            raise ValueError("date_to must be on or after date_from")
        return v


class AllocationUpdate(BaseModel):
    number_of_days: Optional[Decimal] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[AllocationStatus] = None


class AllocationOut(BaseModel):
    id: UUID
    employee_id: UUID
    time_off_type_id: UUID
    number_of_days: Decimal
    taken: Decimal
    remaining: Decimal
    date_from: date
    date_to: Optional[date] = None
    status: AllocationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Time Off Requests ---

class TimeOffRequestCreate(BaseModel):
    employee_id: UUID
    time_off_type_id: UUID
    date_from: date
    date_to: date
    duration: Decimal
    note: Optional[str] = None

    @field_validator("date_to")
    @classmethod
    def date_to_after_from(cls, v, info):
        start = info.data.get("date_from")
        if start is not None and v < start:
            raise ValueError("date_to must be on or after date_from")
        return v

    @field_validator("duration")
    @classmethod
    def duration_positive(cls, v):
        if v <= 0:
            raise ValueError("duration must be > 0")
        return v


class TimeOffRequestUpdate(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    duration: Optional[Decimal] = None
    note: Optional[str] = None
    status: Optional[TimeOffRequestStatus] = None


class TimeOffRequestOut(BaseModel):
    id: UUID
    employee_id: UUID
    time_off_type_id: UUID
    allocation_id: Optional[UUID] = None
    date_from: date
    date_to: date
    duration: Decimal
    status: TimeOffRequestStatus
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
