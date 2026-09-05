from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AttendanceStatus(str, Enum):
    present  = "present"
    late     = "late"
    absent   = "absent"
    overtime = "overtime"


class AttendanceCreate(BaseModel):
    employee_id: UUID
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.present
    note: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None
    note: Optional[str] = None


class AttendanceOut(BaseModel):
    id: UUID
    employee_id: UUID
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    worked_hours: Optional[Decimal] = None
    status: AttendanceStatus
    is_manual: bool
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
