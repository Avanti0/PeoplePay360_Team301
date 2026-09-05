from decimal import Decimal
from sqlalchemy import Column, Text, Boolean, Date, Numeric, TIMESTAMP, ForeignKey, CheckConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import time_off_unit_enum, allocation_status_enum, time_off_request_status_enum


class TimeOffType(Base):
    __tablename__ = "time_off_types"

    id                  = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name                = Column(Text, nullable=False, unique=True)
    unit                = Column(time_off_unit_enum, nullable=False, server_default="days")
    requires_allocation = Column(Boolean, nullable=False, server_default="true")
    approval_required   = Column(Boolean, nullable=False, server_default="true")
    is_active           = Column(Boolean, nullable=False, server_default="true")

    allocations = relationship("Allocation", back_populates="time_off_type")
    requests    = relationship("TimeOffRequest", back_populates="time_off_type")


class Allocation(Base):
    __tablename__ = "allocations"

    id               = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id      = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    time_off_type_id = Column(UUID(as_uuid=True), ForeignKey("time_off_types.id"), nullable=False)
    number_of_days   = Column(Numeric(6, 2), nullable=False)
    date_from        = Column(Date, nullable=False)
    date_to          = Column(Date)
    status           = Column(allocation_status_enum, nullable=False, server_default="draft")
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee      = relationship("Employee", back_populates="allocations", foreign_keys=[employee_id])
    time_off_type = relationship("TimeOffType", back_populates="allocations")
    requests      = relationship("TimeOffRequest", back_populates="allocation", lazy="selectin")

    @property
    def taken(self) -> Decimal:
        """Derived from approved requests consuming this allocation."""
        if not self.requests:
            return Decimal("0.00")
        return sum(
            (Decimal(str(r.duration)) for r in self.requests if r.status == "approved"),
            Decimal("0.00"),
        )

    @property
    def remaining(self) -> Decimal:
        """Derived: number_of_days - taken."""
        days = Decimal(str(self.number_of_days)) if self.number_of_days is not None else Decimal("0.00")
        return days - self.taken


class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"
    __table_args__ = (CheckConstraint("date_to >= date_from"),)

    id               = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id      = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    time_off_type_id = Column(UUID(as_uuid=True), ForeignKey("time_off_types.id"), nullable=False)
    allocation_id    = Column(UUID(as_uuid=True), ForeignKey("allocations.id", ondelete="SET NULL"))
    date_from        = Column(Date, nullable=False)
    date_to          = Column(Date, nullable=False)
    duration         = Column(Numeric(6, 2), nullable=False)
    status           = Column(time_off_request_status_enum, nullable=False, server_default="draft")
    note             = Column(Text)
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee      = relationship("Employee", back_populates="time_off_requests", foreign_keys=[employee_id])
    time_off_type = relationship("TimeOffType", back_populates="requests")
    allocation    = relationship("Allocation", back_populates="requests")
