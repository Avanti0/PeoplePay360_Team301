from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AttendanceStatus(str, Enum):
    present  = "present"
    late     = "late"
    absent   = "absent"
    half_day = "half_day"
    on_leave = "on_leave"


class AttendanceCreate(BaseModel):
    employee_id: int
    work_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.present
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None
    notes: Optional[str] = None


class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    work_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    worked_hours: Decimal
    status: AttendanceStatus
    is_manual_correction: bool
    corrected_by: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
