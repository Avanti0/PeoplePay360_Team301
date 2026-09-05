from datetime import date, datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.payroll import (
    SalaryStructure, SalaryRule, Payrun, PayrunEmployee,
    Payslip, PayslipLine, PayrollWarning,
)
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.schemas.payroll import SalaryStructureCreate, SalaryStructureUpdate, SalaryRuleCreate, SalaryRuleUpdate, PayrunCreate
from app.services.contract_service import resolve_contract_for_period


# ── helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _immutable_guard(obj_status: str) -> None:
    if obj_status in ("validated", "paid"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Validated/paid records are immutable")


# ── Salary Structures ─────────────────────────────────────────────────────────

def list_structures(db: Session) -> list[SalaryStructure]:
    return db.query(SalaryStructure).order_by(SalaryStructure.name).all()

def get_structure(db: Session, structure_id: int) -> SalaryStructure:
    obj = db.query(SalaryStructure).filter(SalaryStructure.id == structure_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Salary structure not found")
    return obj

def create_structure(db: Session, data: SalaryStructureCreate) -> SalaryStructure:
    obj = SalaryStructure(**data.model_dump())
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Structure code must be unique")
    db.refresh(obj)
    return obj

def update_structure(db: Session, structure_id: int, data: SalaryStructureUpdate) -> SalaryStructure:
    obj = get_structure(db, structure_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj


# ── Salary Rules ──────────────────────────────────────────────────────────────

def list_rules(db: Session, structure_id: Optional[int] = None) -> list[SalaryRule]:
    q = db.query(SalaryRule)
    if structure_id:
        q = q.filter(SalaryRule.salary_structure_id == structure_id)
    return q.order_by(SalaryRule.salary_structure_id, SalaryRule.sequence).all()

def get_rule(db: Session, rule_id: int) -> SalaryRule:
    obj = db.query(SalaryRule).filter(SalaryRule.id == rule_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Salary rule not found")
    return obj

def create_rule(db: Session, data: SalaryRuleCreate) -> SalaryRule:
    get_structure(db, data.salary_structure_id)  # existence check
    obj = SalaryRule(**data.model_dump())
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Rule code must be unique within the structure")
    db.refresh(obj)
    return obj

def update_rule(db: Session, rule_id: int, data: SalaryRuleUpdate) -> SalaryRule:
    obj = get_rule(db, rule_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

def delete_rule(db: Session, rule_id: int) -> None:
    obj = get_rule(db, rule_id)
    db.delete(obj); db.commit()


# ── Salary Rule Engine ────────────────────────────────────────────────────────

def _execute_rules(rules: list[SalaryRule], wage: float) -> dict[str, float]:
    """Evaluate salary rules in sequence order.
    Context starts with WAGE so formulas can reference it.
    Each rule's result is stored by its code for later rules to reference."""
    ctx: dict[str, float] = {"WAGE": wage}

    for rule in sorted(rules, key=lambda r: r.sequence):
        if not rule.is_active:
            continue
        try:
            if rule.computation_method == "fixed":
                result = float(rule.amount or 0)
            elif rule.computation_method == "percentage":
                base = ctx.get(rule.percentage_of_code, 0)
                result = base * float(rule.percentage or 0) / 100
            else:  # formula — safe eval with only ctx in scope
                result = float(eval(rule.formula, {"__builtins__": {}}, ctx))  # noqa: S307
        except Exception:
            result = 0.0
        ctx[rule.code] = result

    return ctx


def _count_worked_days(db: Session, employee_id: int, period_start: date, period_end: date) -> float:
    records = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            Attendance.check_in >= datetime.combine(period_start, datetime.min.time()),
            Attendance.check_in <= datetime.combine(period_end, datetime.max.time()),
            Attendance.worked_hours.isnot(None),
            Attendance.worked_hours > 0,
        )
        .all()
    )
    return float(len(records))


# ── Payrun CRUD ───────────────────────────────────────────────────────────────

def list_payruns(db: Session) -> list[Payrun]:
    return db.query(Payrun).order_by(Payrun.period_start.desc()).all()

def get_payrun(db: Session, payrun_id: int) -> Payrun:
    obj = db.query(Payrun).filter(Payrun.id == payrun_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Payrun not found")
    return obj

def create_payrun(db: Session, data: PayrunCreate, created_by: int) -> Payrun:
    if data.period_end < data.period_start:
        raise HTTPException(status_code=400, detail="period_end must be >= period_start")
    get_structure(db, data.salary_structure_id)

    payrun = Payrun(
        name=data.name,
        salary_structure_id=data.salary_structure_id,
        period_start=data.period_start,
        period_end=data.period_end,
        created_by=created_by,
    )
    db.add(payrun)
    db.flush()  # get payrun.id before adding employees

    for emp_id in data.employee_ids:
        if not db.query(Employee).filter(Employee.id == emp_id).first():
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Employee {emp_id} not found")
        db.add(PayrunEmployee(payrun_id=payrun.id, employee_id=emp_id))

    db.commit(); db.refresh(payrun)
    return payrun


# ── Payrun Actions ────────────────────────────────────────────────────────────

def compute_payrun(db: Session, payrun_id: int) -> Payrun:
    payrun = get_payrun(db, payrun_id)
    if payrun.status not in ("draft", "computed"):
        raise HTTPException(status_code=400, detail="Only draft or computed payruns can be recomputed")

    structure = get_structure(db, payrun.salary_structure_id)
    active_rules = [r for r in structure.rules if r.is_active]

    # delete existing payslips so recompute is clean
    for ps in payrun.payslips:
        db.delete(ps)
    db.flush()

    for pe in payrun.selected_employees:
        emp_id = pe.employee_id
        contract = resolve_contract_for_period(db, emp_id, payrun.period_start, payrun.period_end)

        payslip = Payslip(
            payrun_id=payrun.id,
            employee_id=emp_id,
            contract_id=contract.id if contract else None,
            worked_days=_count_worked_days(db, emp_id, payrun.period_start, payrun.period_end),
        )
        db.add(payslip)
        db.flush()

        # warnings
        if not contract:
            db.add(PayrollWarning(payslip_id=payslip.id, warning_type="missing_contract",
                                  message="No active contract found for this payroll period"))
        else:
            emp = db.query(Employee).filter(Employee.id == emp_id).first()
            if not getattr(emp, "bank_account_number", None):
                db.add(PayrollWarning(payslip_id=payslip.id, warning_type="missing_bank_details",
                                      message="Employee has no bank account on file"))

        wage = float(contract.wage) if contract else 0.0
        ctx = _execute_rules(active_rules, wage)

        gross = sum(v for code, v in ctx.items()
                    if code != "WAGE" and _rule_category(active_rules, code) in ("basic", "allowance", "gross"))
        deductions = sum(v for code, v in ctx.items()
                         if _rule_category(active_rules, code) == "deduction")
        net = ctx.get("NET", gross - deductions)

        payslip.gross_salary = gross
        payslip.total_deductions = deductions
        payslip.net_salary = net
        payslip.status = "computed"

        for rule in sorted(active_rules, key=lambda r: r.sequence):
            if rule.code in ctx:
                db.add(PayslipLine(
                    payslip_id=payslip.id,
                    salary_rule_id=rule.id,
                    code=rule.code,
                    name=rule.name,
                    category=rule.category,
                    sequence=rule.sequence,
                    amount=ctx[rule.code],
                ))

    payrun.status = "computed"
    payrun.computed_at = _now()
    db.commit(); db.refresh(payrun)
    return payrun


def _rule_category(rules: list[SalaryRule], code: str) -> str:
    for r in rules:
        if r.code == code:
            return r.category
    return ""


def validate_payrun(db: Session, payrun_id: int) -> Payrun:
    payrun = get_payrun(db, payrun_id)
    if payrun.status != "computed":
        raise HTTPException(status_code=400, detail="Payrun must be computed before validation")

    payrun.status = "validated"
    payrun.validated_at = _now()
    for ps in payrun.payslips:
        ps.status = "validated"

    db.commit(); db.refresh(payrun)
    return payrun


def mark_paid(db: Session, payrun_id: int) -> Payrun:
    payrun = get_payrun(db, payrun_id)
    if payrun.status != "validated":
        raise HTTPException(status_code=400, detail="Payrun must be validated before marking paid")

    payrun.status = "paid"
    payrun.paid_at = _now()
    for ps in payrun.payslips:
        ps.status = "paid"

    db.commit(); db.refresh(payrun)
    return payrun


# ── Payslips ──────────────────────────────────────────────────────────────────

def list_payslips(db: Session, payrun_id: Optional[int] = None, employee_id: Optional[int] = None) -> list[Payslip]:
    q = db.query(Payslip)
    if payrun_id:
        q = q.filter(Payslip.payrun_id == payrun_id)
    if employee_id:
        q = q.filter(Payslip.employee_id == employee_id)
    return q.all()

def get_payslip(db: Session, payslip_id: int) -> Payslip:
    obj = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Payslip not found")
    return obj
