from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum


class SalaryRuleCategory(str, Enum):
    basic      = "basic"
    allowance  = "allowance"
    gross      = "gross"
    deduction  = "deduction"
    net        = "net"

class ComputationMethod(str, Enum):
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
    code: str
    description: Optional[str] = None

class SalaryStructureUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SalaryRuleOut(BaseModel):
    id: int
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    computation_method: ComputationMethod
    amount: Optional[float] = None
    percentage: Optional[float] = None
    percentage_of_code: Optional[str] = None
    formula: Optional[str] = None
    is_active: bool
    class Config: from_attributes = True

class SalaryStructureOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool
    rules: list[SalaryRuleOut] = []
    class Config: from_attributes = True


# --- Salary Rule ---
class SalaryRuleCreate(BaseModel):
    salary_structure_id: int
    name: str
    code: str
    category: SalaryRuleCategory
    sequence: int = 10
    computation_method: ComputationMethod
    amount: Optional[float] = None
    percentage: Optional[float] = None
    percentage_of_code: Optional[str] = None
    formula: Optional[str] = None

class SalaryRuleUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[SalaryRuleCategory] = None
    sequence: Optional[int] = None
    computation_method: Optional[ComputationMethod] = None
    amount: Optional[float] = None
    percentage: Optional[float] = None
    percentage_of_code: Optional[str] = None
    formula: Optional[str] = None
    is_active: Optional[bool] = None


# --- Payrun ---
class PayrunCreate(BaseModel):
    name: str
    salary_structure_id: int
    period_start: date
    period_end: date
    employee_ids: list[int]

class PayrunOut(BaseModel):
    id: int
    name: str
    salary_structure_id: int
    period_start: date
    period_end: date
    status: PayrunStatus
    computed_at: Optional[datetime] = None
    validated_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    class Config: from_attributes = True


# --- Payslip ---
class PayslipLineOut(BaseModel):
    id: int
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    amount: float
    class Config: from_attributes = True

class WarningOut(BaseModel):
    id: int
    warning_type: str
    message: str
    class Config: from_attributes = True

class PayslipOut(BaseModel):
    id: int
    payrun_id: int
    employee_id: int
    contract_id: Optional[int] = None
    worked_days: float
    gross_salary: float
    total_deductions: float
    net_salary: float
    status: PayslipStatus
    pdf_path: Optional[str] = None
    emailed_at: Optional[datetime] = None
    lines: list[PayslipLineOut] = []
    warnings: list[WarningOut] = []
    class Config: from_attributes = True
