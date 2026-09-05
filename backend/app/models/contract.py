from sqlalchemy import Column, BigInteger, Date, Numeric, TIMESTAMP, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import employment_type_enum, contract_status_enum


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint("end_date IS NULL OR end_date >= start_date"),
    )

    id                   = Column(BigInteger, primary_key=True)
    employee_id          = Column(BigInteger, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    start_date           = Column(Date, nullable=False)
    end_date             = Column(Date)
    wage                 = Column(Numeric(14, 2), nullable=False)
    department_id        = Column(BigInteger, ForeignKey("departments.id", ondelete="SET NULL"))
    job_position_id      = Column(BigInteger, ForeignKey("job_positions.id", ondelete="SET NULL"))
    working_schedule_id  = Column(BigInteger, ForeignKey("working_schedules.id", ondelete="SET NULL"))
    salary_structure_id  = Column(BigInteger, ForeignKey("salary_structures.id", ondelete="SET NULL"))
    employment_type      = Column(employment_type_enum, nullable=False, server_default="permanent")
    status               = Column(contract_status_enum, nullable=False, server_default="draft")
    created_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at           = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    employee         = relationship("Employee", back_populates="contracts", foreign_keys=[employee_id])
    department       = relationship("Department")
    job_position     = relationship("JobPosition", back_populates="contracts")
    working_schedule = relationship("WorkingSchedule", back_populates="contracts")
    salary_structure = relationship("SalaryStructure", back_populates="contracts")
    payslips         = relationship("Payslip", back_populates="contract")
