from sqlalchemy import (
    Column, BigInteger, Text, Boolean, Integer, Numeric, Date, TIMESTAMP,
    ForeignKey, UniqueConstraint, CheckConstraint, func,
)
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import (
    salary_rule_category_enum, computation_method_enum,
    payrun_status_enum, payslip_status_enum, warning_type_enum,
)


class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id          = Column(BigInteger, primary_key=True)
    name        = Column(Text, nullable=False)
    code        = Column(Text, nullable=False, unique=True)
    description = Column(Text)
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

    id                  = Column(BigInteger, primary_key=True)
    salary_structure_id = Column(BigInteger, ForeignKey("salary_structures.id", ondelete="CASCADE"), nullable=False)
    name                = Column(Text, nullable=False)
    code                = Column(Text, nullable=False)
    category            = Column(salary_rule_category_enum, nullable=False)
    sequence            = Column(Integer, nullable=False, server_default="10")
    computation_method  = Column(computation_method_enum, nullable=False)
    amount              = Column(Numeric(14, 2))
    percentage          = Column(Numeric(6, 3))
    percentage_of_code  = Column(Text)
    formula             = Column(Text)
    is_active           = Column(Boolean, nullable=False, server_default="true")

    salary_structure = relationship("SalaryStructure", back_populates="rules")
    payslip_lines    = relationship("PayslipLine", back_populates="salary_rule")


class Payrun(Base):
    __tablename__ = "payruns"
    __table_args__ = (CheckConstraint("period_end >= period_start"),)

    id                  = Column(BigInteger, primary_key=True)
    name                = Column(Text, nullable=False)
    salary_structure_id = Column(BigInteger, ForeignKey("salary_structures.id"), nullable=False)
    period_start        = Column(Date, nullable=False)
    period_end          = Column(Date, nullable=False)
    status              = Column(payrun_status_enum, nullable=False, server_default="draft")
    created_by          = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"))
    computed_at         = Column(TIMESTAMP(timezone=True))
    validated_at        = Column(TIMESTAMP(timezone=True))
    paid_at             = Column(TIMESTAMP(timezone=True))
    created_at          = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    salary_structure   = relationship("SalaryStructure", back_populates="payruns")
    creator            = relationship("Employee", foreign_keys=[created_by])
    selected_employees = relationship("PayrunEmployee", back_populates="payrun", cascade="all, delete-orphan")
    payslips           = relationship("Payslip", back_populates="payrun", cascade="all, delete-orphan")


class PayrunEmployee(Base):
    __tablename__ = "payrun_employees"
    __table_args__ = (UniqueConstraint("payrun_id", "employee_id"),)

    id          = Column(BigInteger, primary_key=True)
    payrun_id   = Column(BigInteger, ForeignKey("payruns.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(BigInteger, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)

    payrun   = relationship("Payrun", back_populates="selected_employees")
    employee = relationship("Employee")


class Payslip(Base):
    __tablename__ = "payslips"
    __table_args__ = (UniqueConstraint("payrun_id", "employee_id"),)

    id               = Column(BigInteger, primary_key=True)
    payrun_id        = Column(BigInteger, ForeignKey("payruns.id", ondelete="CASCADE"), nullable=False)
    employee_id      = Column(BigInteger, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    contract_id      = Column(BigInteger, ForeignKey("contracts.id", ondelete="SET NULL"))
    worked_days      = Column(Numeric(5, 2), nullable=False, server_default="0")
    gross_salary     = Column(Numeric(14, 2), nullable=False, server_default="0")
    total_deductions = Column(Numeric(14, 2), nullable=False, server_default="0")
    net_salary       = Column(Numeric(14, 2), nullable=False, server_default="0")
    status           = Column(payslip_status_enum, nullable=False, server_default="draft")
    pdf_path         = Column(Text)
    emailed_at       = Column(TIMESTAMP(timezone=True))
    created_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at       = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    payrun   = relationship("Payrun", back_populates="payslips")
    employee = relationship("Employee")
    contract = relationship("Contract", back_populates="payslips")
    lines    = relationship(
        "PayslipLine", back_populates="payslip",
        cascade="all, delete-orphan", order_by="PayslipLine.sequence",
    )
    warnings = relationship("PayrollWarning", back_populates="payslip", cascade="all, delete-orphan")


class PayslipLine(Base):
    __tablename__ = "payslip_lines"

    id             = Column(BigInteger, primary_key=True)
    payslip_id     = Column(BigInteger, ForeignKey("payslips.id", ondelete="CASCADE"), nullable=False)
    salary_rule_id = Column(BigInteger, ForeignKey("salary_rules.id", ondelete="SET NULL"))
    code           = Column(Text, nullable=False)
    name           = Column(Text, nullable=False)
    category       = Column(salary_rule_category_enum, nullable=False)
    sequence       = Column(Integer, nullable=False, server_default="10")
    amount         = Column(Numeric(14, 2), nullable=False, server_default="0")

    payslip     = relationship("Payslip", back_populates="lines")
    salary_rule = relationship("SalaryRule", back_populates="payslip_lines")


class PayrollWarning(Base):
    __tablename__ = "payroll_warnings"

    id           = Column(BigInteger, primary_key=True)
    payslip_id   = Column(BigInteger, ForeignKey("payslips.id", ondelete="CASCADE"), nullable=False)
    warning_type = Column(warning_type_enum, nullable=False)
    message      = Column(Text, nullable=False)
    created_at   = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    payslip = relationship("Payslip", back_populates="warnings")
