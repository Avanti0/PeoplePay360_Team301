from sqlalchemy import Column, BigInteger, Text, Date, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import gender_type_enum, employment_status_enum


class Employee(Base):
    __tablename__ = "employees"

    id                   = Column(BigInteger, primary_key=True)
    employee_code        = Column(Text, nullable=False, unique=True)
    first_name           = Column(Text, nullable=False)
    last_name            = Column(Text, nullable=False)
    email                = Column(Text, nullable=False, unique=True)
    phone                = Column(Text)
    gender               = Column(gender_type_enum)
    date_of_birth        = Column(Date)
    date_joined          = Column(Date, nullable=False)
    department_id        = Column(BigInteger, ForeignKey("departments.id", ondelete="SET NULL"))
    job_position_id      = Column(BigInteger, ForeignKey("job_positions.id", ondelete="SET NULL"))
    manager_id           = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"))
    working_schedule_id  = Column(BigInteger, ForeignKey("working_schedules.id", ondelete="SET NULL"))
    role_id              = Column(BigInteger, ForeignKey("roles.id"), nullable=False)
    employment_status    = Column(employment_status_enum, nullable=False, server_default="active")
    bank_account_number  = Column(Text)
    bank_name            = Column(Text)
    bank_ifsc            = Column(Text)
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    department       = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    job_position     = relationship("JobPosition", back_populates="employees")
    manager          = relationship("Employee", remote_side=[id], foreign_keys=[manager_id])
    working_schedule = relationship("WorkingSchedule", back_populates="employees")
    role             = relationship("Role", back_populates="employees")

    user               = relationship("User", back_populates="employee", uselist=False)
    contracts          = relationship("Contract", back_populates="employee", foreign_keys="Contract.employee_id")
    attendance_records = relationship("Attendance", back_populates="employee", foreign_keys="Attendance.employee_id")
    leave_allocations  = relationship("LeaveAllocation", back_populates="employee", foreign_keys="LeaveAllocation.employee_id")
    time_off_requests  = relationship("TimeOffRequest", back_populates="employee", foreign_keys="TimeOffRequest.employee_id")
