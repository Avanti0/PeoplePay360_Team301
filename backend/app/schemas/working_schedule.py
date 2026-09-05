from pydantic import BaseModel
from typing import Optional
from datetime import time


class ScheduleLineCreate(BaseModel):
    day_of_week: int        # 0=Mon … 6=Sun
    is_working_day: bool = True
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    break_minutes: int = 0

class ScheduleLineOut(ScheduleLineCreate):
    id: int
    schedule_id: int
    class Config: from_attributes = True

class WorkingScheduleCreate(BaseModel):
    name: str
    schedule_type: str = "full_time"
    lines: list[ScheduleLineCreate] = []

class WorkingScheduleUpdate(BaseModel):
    name: Optional[str] = None
    schedule_type: Optional[str] = None
    is_active: Optional[bool] = None
    lines: Optional[list[ScheduleLineCreate]] = None  # replaces all lines if provided

class WorkingScheduleOut(BaseModel):
    id: int
    name: str
    schedule_type: str
    is_active: bool
    weekly_hours: float         # computed
    lines: list[ScheduleLineOut] = []
    class Config: from_attributes = True
