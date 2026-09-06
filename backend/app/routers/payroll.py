from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import (
    require_hr_manager,
    require_hr_payroll_user,
    require_hr_payroll_manager,
    require_admin,
    get_current_user,
    is_hr_manager_or_above,
    is_hr_payroll_user_or_above,
    current_employee_id,
)
from app.schemas.payroll import (
    SalaryStructureCreate, SalaryStructureUpdate, SalaryStructureOut,
    SalaryRuleCreate, SalaryRuleUpdate, SalaryRuleOut,
    PayrunCreate, PayrunOut, PayslipOut,
)
from app.services import payroll_service as svc
from app.services.pdf_service import generate_payslip_pdf
from app.services.email_service import send_payslips_bulk

# ── Salary Structures ─────────────────────────────────────────────────────────
structures_router = APIRouter(prefix="/api/v1/salary-structures", tags=["salary-structures"])

@structures_router.get("", response_model=list[SalaryStructureOut])
def list_structures(db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.list_structures(db)

@structures_router.post("", response_model=SalaryStructureOut, status_code=201)
def create_structure(data: SalaryStructureCreate, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return svc.create_structure(db, data)

@structures_router.get("/{structure_id}", response_model=SalaryStructureOut)
def get_structure(structure_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.get_structure(db, structure_id)

@structures_router.put("/{structure_id}", response_model=SalaryStructureOut)
def update_structure(structure_id: UUID, data: SalaryStructureUpdate, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return svc.update_structure(db, structure_id, data)


# ── Salary Rules ──────────────────────────────────────────────────────────────
rules_router = APIRouter(prefix="/api/v1/salary-rules", tags=["salary-rules"])

@rules_router.get("", response_model=list[SalaryRuleOut])
def list_rules(structure_id: Optional[UUID] = None, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.list_rules(db, structure_id)

@rules_router.post("", response_model=SalaryRuleOut, status_code=201)
def create_rule(data: SalaryRuleCreate, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return svc.create_rule(db, data)

@rules_router.get("/{rule_id}", response_model=SalaryRuleOut)
def get_rule(rule_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.get_rule(db, rule_id)

@rules_router.put("/{rule_id}", response_model=SalaryRuleOut)
def update_rule(rule_id: UUID, data: SalaryRuleUpdate, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return svc.update_rule(db, rule_id, data)

@rules_router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc.delete_rule(db, rule_id)


# ── Payruns ───────────────────────────────────────────────────────────────────
payruns_router = APIRouter(prefix="/api/v1/payruns", tags=["payruns"])

@payruns_router.get("", response_model=list[PayrunOut])
def list_payruns(db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.list_payruns(db)

@payruns_router.post("", response_model=PayrunOut, status_code=201)
def create_payrun(data: PayrunCreate, db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.create_payrun(db, data)

@payruns_router.get("/{payrun_id}", response_model=PayrunOut)
def get_payrun(payrun_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.get_payrun(db, payrun_id)

@payruns_router.post("/{payrun_id}/compute", response_model=PayrunOut)
def compute(payrun_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.compute_payrun(db, payrun_id)

@payruns_router.post("/{payrun_id}/validate", response_model=PayrunOut)
def validate(payrun_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return svc.validate_payrun(db, payrun_id)

@payruns_router.post("/{payrun_id}/mark-paid", response_model=PayrunOut)
def mark_paid(payrun_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return svc.mark_paid(db, payrun_id)

@payruns_router.post("/{payrun_id}/send-payslips")
def send_payslips(payrun_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_payroll_manager)):
    return send_payslips_bulk(db, payrun_id)


# ── Payslips ──────────────────────────────────────────────────────────────────
payslips_router = APIRouter(prefix="/api/v1/payslips", tags=["payslips"])

@payslips_router.get("", response_model=list[PayslipOut])
def list_payslips(
    payrun_id: Optional[UUID] = None,
    employee_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return []
        employee_id = emp_id
    return svc.list_payslips(db, payrun_id, employee_id)

@payslips_router.get("/{payslip_id}", response_model=PayslipOut)
def get_payslip(
    payslip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = svc.get_payslip(db, payslip_id)
    if not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id or emp_id != record.employee_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    return record

@payslips_router.get("/{payslip_id}/pdf")
def download_pdf(
    payslip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = svc.get_payslip(db, payslip_id)
    if not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id or emp_id != record.employee_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    path = generate_payslip_pdf(db, payslip_id)
    return FileResponse(path, media_type="application/pdf",
                        filename=f"payslip_{payslip_id}.pdf")
