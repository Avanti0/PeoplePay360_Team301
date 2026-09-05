from sqlalchemy import Column, Text, Date, Numeric, TIMESTAMP, ForeignKey, CheckConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import contract_status_enum


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint("date_end IS NULL OR date_end >= date_start"),
    )

    id                   = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id          = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date_start           = Column(Date, nullable=False)
    date_end             = Column(Date)
    wage                 = Column(Numeric(14, 2), nullable=False)
    department           = Column(Text)  # plain string per contract.md, not a FK
    job_position         = Column(Text)  # plain string per contract.md, not a FK
    working_schedule_id  = Column(UUID(as_uuid=True), ForeignKey("working_schedules.id", ondelete="SET NULL"))
    salary_structure_id  = Column(UUID(as_uuid=True), ForeignKey("salary_structures.id", ondelete="SET NULL"))
    status               = Column(contract_status_enum, nullable=False, server_default="draft")
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee         = relationship("Employee", back_populates="contracts", foreign_keys=[employee_id])
    working_schedule = relationship("WorkingSchedule", back_populates="contracts")
    salary_structure = relationship("SalaryStructure", back_populates="contracts")
    payslips         = relationship("Payslip", back_populates="contract")
