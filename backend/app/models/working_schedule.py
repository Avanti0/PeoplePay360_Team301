from datetime import date, timedelta
from typing import Optional
from sqlalchemy import (
    Column, Text, Boolean, SmallInteger, Integer, Time,
    TIMESTAMP, ForeignKey, UniqueConstraint, CheckConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class WorkingSchedule(Base):
    __tablename__ = "working_schedules"

    id          = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name        = Column(Text, nullable=False, unique=True)
    is_active   = Column(Boolean, nullable=False, server_default="true")
    created_at  = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    lines     = relationship("ScheduleLine", back_populates="schedule", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="working_schedule")
    contracts = relationship("Contract", back_populates="working_schedule")


class ScheduleLine(Base):
    __tablename__ = "schedule_lines"
    __table_args__ = (
        UniqueConstraint("schedule_id", "day_of_week"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6"),
    )

    id             = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    schedule_id    = Column(UUID(as_uuid=True), ForeignKey("working_schedules.id", ondelete="CASCADE"), nullable=False)
    day_of_week    = Column(SmallInteger, nullable=False)
    is_working_day = Column(Boolean, nullable=False, server_default="true")
    start_time     = Column(Time)
    end_time       = Column(Time)
    break_minutes  = Column(Integer, nullable=False, server_default="0")

    schedule = relationship("WorkingSchedule", back_populates="lines")


def is_expected_working_day(schedule: Optional["WorkingSchedule"], weekday: int) -> Optional[bool]:
    """Does `schedule` mark `weekday` (0=Mon..6=Sun, matching ScheduleLine.day_of_week
    and Python's date.weekday()) as a working day? None if there's no assigned schedule
    or no line for that day, so callers can distinguish "off day" from "not tracked"."""
    if schedule is None:
        return None
    for line in schedule.lines:
        if line.day_of_week == weekday:
            return line.is_working_day
    return None


def count_expected_working_days(schedule: Optional["WorkingSchedule"], period_start: date, period_end: date) -> Optional[int]:
    """How many days in [period_start, period_end] are working days per `schedule`.
    Purely informational — used to give payroll/attendance context alongside actual
    worked days, never to alter salary-rule computation."""
    if schedule is None or period_start is None or period_end is None:
        return None
    working_weekdays = {line.day_of_week for line in schedule.lines if line.is_working_day}
    if not working_weekdays:
        return 0
    count = 0
    current = period_start
    while current <= period_end:
        if current.weekday() in working_weekdays:
            count += 1
        current += timedelta(days=1)
    return count
