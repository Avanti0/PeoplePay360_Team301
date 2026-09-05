from sqlalchemy import Column, BigInteger, Date, TIMESTAMP, Numeric, Boolean, Text, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import attendance_status_enum


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("employee_id", "work_date"),)

    id                   = Column(BigInteger, primary_key=True)
    employee_id          = Column(BigInteger, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    work_date            = Column(Date, nullable=False)
    check_in             = Column(TIMESTAMP(timezone=True))
    check_out            = Column(TIMESTAMP(timezone=True))
    worked_hours         = Column(Numeric(5, 2), nullable=False, server_default="0")
    status               = Column(attendance_status_enum, nullable=False, server_default="present")
    is_manual_correction = Column(Boolean, nullable=False, server_default="false")
    corrected_by         = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"))
    notes                = Column(Text)
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee  = relationship("Employee", back_populates="attendance_records", foreign_keys=[employee_id])
    corrector = relationship("Employee", foreign_keys=[corrected_by])
