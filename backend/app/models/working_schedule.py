from sqlalchemy import (
    Column, BigInteger, Text, Boolean, SmallInteger, Integer, Time,
    TIMESTAMP, ForeignKey, UniqueConstraint, CheckConstraint, func,
)
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import schedule_type_enum


class WorkingSchedule(Base):
    __tablename__ = "working_schedules"

    id            = Column(BigInteger, primary_key=True)
    name          = Column(Text, nullable=False, unique=True)
    schedule_type = Column(schedule_type_enum, nullable=False, server_default="full_time")
    is_active     = Column(Boolean, nullable=False, server_default="true")
    created_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    lines     = relationship("WorkingScheduleLine", back_populates="schedule", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="working_schedule")
    contracts = relationship("Contract", back_populates="working_schedule")


class WorkingScheduleLine(Base):
    __tablename__ = "working_schedule_lines"
    __table_args__ = (
        UniqueConstraint("schedule_id", "day_of_week"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6"),
    )

    id             = Column(BigInteger, primary_key=True)
    schedule_id    = Column(BigInteger, ForeignKey("working_schedules.id", ondelete="CASCADE"), nullable=False)
    day_of_week    = Column(SmallInteger, nullable=False)
    is_working_day = Column(Boolean, nullable=False, server_default="true")
    start_time     = Column(Time)
    end_time       = Column(Time)
    break_minutes  = Column(Integer, nullable=False, server_default="0")

    schedule = relationship("WorkingSchedule", back_populates="lines")
