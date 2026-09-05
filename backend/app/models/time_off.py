from sqlalchemy import Column, BigInteger, Text, Boolean, Date, Numeric, TIMESTAMP, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import time_off_unit_enum, allocation_status_enum, time_off_request_status_enum


class TimeOffType(Base):
    __tablename__ = "time_off_types"

    id                  = Column(BigInteger, primary_key=True)
    name                = Column(Text, nullable=False, unique=True)
    unit                = Column(time_off_unit_enum, nullable=False, server_default="days")
    requires_allocation = Column(Boolean, nullable=False, server_default="true")
    affects_payroll     = Column(Boolean, nullable=False, server_default="true")
    is_active           = Column(Boolean, nullable=False, server_default="true")

    allocations = relationship("LeaveAllocation", back_populates="time_off_type")
    requests    = relationship("TimeOffRequest", back_populates="time_off_type")


class LeaveAllocation(Base):
    __tablename__ = "leave_allocations"

    id               = Column(BigInteger, primary_key=True)
    employee_id      = Column(BigInteger, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    time_off_type_id = Column(BigInteger, ForeignKey("time_off_types.id"), nullable=False)
    allocated_amount = Column(Numeric(6, 2), nullable=False)
    taken_amount     = Column(Numeric(6, 2), nullable=False, server_default="0")
    valid_from       = Column(Date, nullable=False)
    valid_to         = Column(Date)
    status           = Column(allocation_status_enum, nullable=False, server_default="draft")
    approved_by      = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"))
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee      = relationship("Employee", back_populates="leave_allocations", foreign_keys=[employee_id])
    time_off_type = relationship("TimeOffType", back_populates="allocations")
    approver      = relationship("Employee", foreign_keys=[approved_by])
    requests      = relationship("TimeOffRequest", back_populates="allocation")


class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"
    __table_args__ = (CheckConstraint("end_date >= start_date"),)

    id               = Column(BigInteger, primary_key=True)
    employee_id      = Column(BigInteger, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    time_off_type_id = Column(BigInteger, ForeignKey("time_off_types.id"), nullable=False)
    allocation_id    = Column(BigInteger, ForeignKey("leave_allocations.id", ondelete="SET NULL"))
    start_date       = Column(Date, nullable=False)
    end_date         = Column(Date, nullable=False)
    duration         = Column(Numeric(6, 2), nullable=False)
    status           = Column(time_off_request_status_enum, nullable=False, server_default="submitted")
    reason           = Column(Text)
    approved_by      = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"))
    approved_at      = Column(TIMESTAMP(timezone=True))
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee      = relationship("Employee", back_populates="time_off_requests", foreign_keys=[employee_id])
    time_off_type = relationship("TimeOffType", back_populates="requests")
    allocation    = relationship("LeaveAllocation", back_populates="requests")
    approver      = relationship("Employee", foreign_keys=[approved_by])
