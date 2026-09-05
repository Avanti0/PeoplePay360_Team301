from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID


class SalaryRuleCategory(str, Enum):
    basic     = "basic"
    allowance = "allowance"
    gross     = "gross"
    deduction = "deduction"
    net       = "net"

class ComputationType(str, Enum):
    fixed      = "fixed"
    percentage = "percentage"
    formula    = "formula"

class PayrunStatus(str, Enum):
    draft     = "draft"
    computed  = "computed"
    validated = "validated"
    paid      = "paid"

class PayslipStatus(str, Enum):
    draft     = "draft"
    computed  = "computed"
    validated = "validated"
    paid      = "paid"


# --- Salary Structure ---
class SalaryStructureCreate(BaseModel):
    name: str
    is_active: bool = True

class SalaryStructureUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class SalaryRuleOut(BaseModel):
    id: UUID
    salary_structure_id: UUID
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    computation_type: ComputationType
    amount: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    percentage_base: Optional[str] = None
    formula: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class SalaryStructureOut(BaseModel):
    id: UUID
    name: str
    is_active: bool
    created_at: datetime
    rules: list[SalaryRuleOut] = []

    model_config = ConfigDict(from_attributes=True)


# --- Salary Rule ---
class SalaryRuleCreate(BaseModel):
    salary_structure_id: UUID
    name: str
    code: str
    category: SalaryRuleCategory
    sequence: int = 10
    computation_type: ComputationType
    amount: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    percentage_base: Optional[str] = None
    formula: Optional[str] = None

class SalaryRuleUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[SalaryRuleCategory] = None
    sequence: Optional[int] = None
    computation_type: Optional[ComputationType] = None
    amount: Optional[Decimal] = None
    percentage: Optional[Decimal] = None
    percentage_base: Optional[str] = None
    formula: Optional[str] = None
    is_active: Optional[bool] = None


# --- Payrun ---
class PayrunCreate(BaseModel):
    name: str
    salary_structure_id: UUID
    period_start: date
    period_end: date
    employee_ids: list[UUID]

class PayrunOut(BaseModel):
    id: UUID
    name: str
    salary_structure_id: UUID
    period_start: date
    period_end: date
    status: PayrunStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Payslip ---
class PayslipLineOut(BaseModel):
    id: UUID
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)

class PayslipOut(BaseModel):
    id: UUID
    payrun_id: UUID
    employee_id: UUID
    contract_id: Optional[UUID] = None
    period_start: date
    period_end: date
    worked_days: Decimal
    gross_salary: Decimal
    net_salary: Decimal
    status: PayslipStatus
    warnings: list[str] = []
    lines: list[PayslipLineOut] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
