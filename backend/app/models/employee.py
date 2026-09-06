from typing import Optional
from sqlalchemy import Column, Text, TIMESTAMP, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import employment_status_enum


class Employee(Base):
    __tablename__ = "employees"

    id                   = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id              = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    name                 = Column(Text, nullable=False)
    email                = Column(Text, nullable=False, unique=True)
    phone                = Column(Text)
    department           = Column(Text)  # plain string per employee.md, not a FK
    job_position         = Column(Text)  # plain string per employee.md, not a FK
    manager_id           = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"))
    working_schedule_id  = Column(UUID(as_uuid=True), ForeignKey("working_schedules.id", ondelete="SET NULL"))
    employment_status    = Column(employment_status_enum, nullable=False, server_default="active")
    bank_account_number  = Column(Text)
    bank_name            = Column(Text)
    bank_ifsc            = Column(Text)
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    manager          = relationship("Employee", remote_side=[id], foreign_keys=[manager_id])
    working_schedule = relationship("WorkingSchedule", back_populates="employees")

    user               = relationship("User", back_populates="employee", foreign_keys=[user_id])
    contracts          = relationship("Contract", back_populates="employee", foreign_keys="Contract.employee_id")
    attendance_records = relationship("Attendance", back_populates="employee", foreign_keys="Attendance.employee_id")
    allocations        = relationship("Allocation", back_populates="employee", foreign_keys="Allocation.employee_id")
    time_off_requests  = relationship("TimeOffRequest", back_populates="employee", foreign_keys="TimeOffRequest.employee_id")

    @property
    def working_schedule_name(self) -> Optional[str]:
        return self.working_schedule.name if self.working_schedule else None
