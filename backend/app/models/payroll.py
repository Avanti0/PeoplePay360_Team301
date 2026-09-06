from typing import Optional
from sqlalchemy import (
    Column, Text, Boolean, Integer, Numeric, Date, TIMESTAMP,
    ForeignKey, UniqueConstraint, CheckConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import (
    salary_rule_category_enum, computation_type_enum,
    payrun_status_enum, payslip_status_enum,
)
from app.models.working_schedule import count_expected_working_days


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id          = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name        = Column(Text, nullable=False)
    is_active   = Column(Boolean, nullable=False, server_default="true")
    created_at  = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    rules     = relationship(
        "SalaryRule", back_populates="salary_structure",
        cascade="all, delete-orphan", order_by="SalaryRule.sequence",
    )
    contracts = relationship("Contract", back_populates="salary_structure")
    payruns   = relationship("Payrun", back_populates="salary_structure")


class SalaryRule(Base):
    __tablename__ = "salary_rules"
    __table_args__ = (UniqueConstraint("salary_structure_id", "code"),)

    id                  = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    salary_structure_id = Column(UUID(as_uuid=True), ForeignKey("salary_structures.id", ondelete="CASCADE"), nullable=False)
    name                = Column(Text, nullable=False)
    code                = Column(Text, nullable=False)
    category            = Column(salary_rule_category_enum, nullable=False)
    sequence            = Column(Integer, nullable=False, server_default="10")
    computation_type    = Column(computation_type_enum, nullable=False)
    amount              = Column(Numeric(14, 2))
    percentage_base     = Column(Text)
    percentage          = Column(Numeric(6, 3))
    formula             = Column(Text)
    is_active           = Column(Boolean, nullable=False, server_default="true")

    salary_structure = relationship("SalaryStructure", back_populates="rules")
    payslip_lines    = relationship("PayslipLine", back_populates="salary_rule")


class Payrun(Base):
    __tablename__ = "payruns"
    __table_args__ = (CheckConstraint("period_end >= period_start"),)

    id                  = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name                = Column(Text, nullable=False)
    salary_structure_id = Column(UUID(as_uuid=True), ForeignKey("salary_structures.id"), nullable=False)
    period_start        = Column(Date, nullable=False)
    period_end          = Column(Date, nullable=False)
    status              = Column(payrun_status_enum, nullable=False, server_default="draft")
    created_at          = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at          = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    salary_structure   = relationship("SalaryStructure", back_populates="payruns")
    selected_employees = relationship("PayrunEmployee", back_populates="payrun", cascade="all, delete-orphan")
    payslips           = relationship("Payslip", back_populates="payrun", cascade="all, delete-orphan")


class PayrunEmployee(Base):
    __tablename__ = "payrun_employees"
    __table_args__ = (UniqueConstraint("payrun_id", "employee_id"),)

    id          = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    payrun_id   = Column(UUID(as_uuid=True), ForeignKey("payruns.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)

    payrun   = relationship("Payrun", back_populates="selected_employees")
    employee = relationship("Employee")


class Payslip(Base):
    __tablename__ = "payslips"
    __table_args__ = (UniqueConstraint("payrun_id", "employee_id"),)

    id               = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    payrun_id        = Column(UUID(as_uuid=True), ForeignKey("payruns.id", ondelete="CASCADE"), nullable=False)
    employee_id      = Column(UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    contract_id      = Column(UUID(as_uuid=True), ForeignKey("contracts.id", ondelete="SET NULL"))
    period_start     = Column(Date, nullable=False)
    period_end       = Column(Date, nullable=False)
    worked_days      = Column(Numeric(5, 2), nullable=False, server_default="0")
    gross_salary     = Column(Numeric(14, 2), nullable=False, server_default="0")
    net_salary       = Column(Numeric(14, 2), nullable=False, server_default="0")
    status           = Column(payslip_status_enum, nullable=False, server_default="draft")
    warnings         = Column(JSONB, nullable=False, server_default="[]")  # list of warning strings
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    payrun   = relationship("Payrun", back_populates="payslips")
    employee = relationship("Employee")
    contract = relationship("Contract", back_populates="payslips")
    lines    = relationship(
        "PayslipLine", back_populates="payslip",
        cascade="all, delete-orphan", order_by="PayslipLine.sequence",
    )

    @property
    def expected_working_days(self) -> Optional[int]:
        """Working days per the employee's assigned schedule within this
        payslip's period — informational context alongside worked_days,
        computed on read and never fed into gross/net salary math."""
        if self.employee is None:
            return None
        return count_expected_working_days(self.employee.working_schedule, self.period_start, self.period_end)


class PayslipLine(Base):
    __tablename__ = "payslip_lines"

    id             = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    payslip_id     = Column(UUID(as_uuid=True), ForeignKey("payslips.id", ondelete="CASCADE"), nullable=False)
    salary_rule_id = Column(UUID(as_uuid=True), ForeignKey("salary_rules.id", ondelete="SET NULL"))
    name           = Column(Text, nullable=False)
    code           = Column(Text, nullable=False)
    category       = Column(salary_rule_category_enum, nullable=False)
    sequence       = Column(Integer, nullable=False, server_default="10")
    amount         = Column(Numeric(14, 2), nullable=False, server_default="0")

    payslip     = relationship("Payslip", back_populates="lines")
    salary_rule = relationship("SalaryRule", back_populates="payslip_lines")
