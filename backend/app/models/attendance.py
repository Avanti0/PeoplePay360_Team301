from sqlalchemy import Column, TIMESTAMP, Numeric, Boolean, Text, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import attendance_status_enum


class Attendance(Base):
    __tablename__ = "attendance"

    id            = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id   = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    check_in      = Column(TIMESTAMP(timezone=True))
    check_out     = Column(TIMESTAMP(timezone=True))
    worked_hours  = Column(Numeric(5, 2))  # computed on save; NULL if check_out missing
    status        = Column(attendance_status_enum, nullable=False, server_default="present")
    is_manual     = Column(Boolean, nullable=False, server_default="false")
    note          = Column(Text)
    created_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee = relationship("Employee", back_populates="attendance_records", foreign_keys=[employee_id])
