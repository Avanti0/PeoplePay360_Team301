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
