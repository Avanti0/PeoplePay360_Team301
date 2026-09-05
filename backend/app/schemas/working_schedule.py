from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import time
from uuid import UUID


class ScheduleLineCreate(BaseModel):
    day_of_week: int        # 0=Mon … 6=Sun
    is_working_day: bool = True
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_minutes: int = 0

class ScheduleLineOut(ScheduleLineCreate):
    id: UUID
    schedule_id: UUID

    model_config = ConfigDict(from_attributes=True)

class WorkingScheduleCreate(BaseModel):
    name: str
    lines: list[ScheduleLineCreate] = []

class WorkingScheduleUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    lines: Optional[list[ScheduleLineCreate]] = None  # replaces all lines if provided

class WorkingScheduleOut(BaseModel):
    id: UUID
    name: str
    is_active: bool
    weekly_hours: float         # computed
    lines: list[ScheduleLineOut] = []

    model_config = ConfigDict(from_attributes=True)
