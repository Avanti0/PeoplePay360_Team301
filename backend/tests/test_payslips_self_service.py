import pytest
from datetime import date
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.payroll import Payrun, Payslip, PayslipLine, SalaryStructure
from app.routers.payroll import (
    list_payslips as router_list_payslips,
    get_payslip as router_get_payslip,
    download_pdf as router_download_pdf,
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def ensure_test_data(db: Session):
    """Ensure at least 2 employees, users, payrun, and computed payslips exist."""
    employees = db.query(Employee).all()
    assert len(employees) >= 2
    emp_a = employees[0]
    emp_b = employees[1]

    if not emp_a.user:
        u_a = User(username=f"user_ps_{emp_a.id}", password_hash="dummy", role="employee", is_active=True)
        db.add(u_a)
        db.flush()
        emp_a.user_id = u_a.id
        db.commit()
    user_a = emp_a.user
    user_a.role = "employee"

    if not emp_b.user:
        u_b = User(username=f"user_ps_{emp_b.id}", password_hash="dummy", role="employee", is_active=True)
        db.add(u_b)
        db.flush()
        emp_b.user_id = u_b.id
        db.commit()
    user_b = emp_b.user
    user_b.role = "employee"

    # Ensure salary structure and payrun
    struct = db.query(SalaryStructure).first()
    if not struct:
        struct = SalaryStructure(name="Standard Test Structure", is_active=True)
        db.add(struct)
        db.commit()
        db.refresh(struct)

    payrun = db.query(Payrun).first()
    if not payrun:
        payrun = Payrun(
            name="Test Payrun 2026-08",
            salary_structure_id=struct.id,
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 31),
            status="computed",
        )
        db.add(payrun)
        db.commit()
        db.refresh(payrun)

    # Ensure payslip for emp_a
    ps_a = db.query(Payslip).filter(Payslip.employee_id == emp_a.id).first()
    if not ps_a:
        ps_a = Payslip(
            payrun_id=payrun.id,
            employee_id=emp_a.id,
            period_start=payrun.period_start,
            period_end=payrun.period_end,
            worked_days=22,
            gross_salary=60000,
            net_salary=52000,
            status="computed",
        )
        db.add(ps_a)
        db.commit()
        db.refresh(ps_a)

    # Ensure payslip for emp_b
    ps_b = db.query(Payslip).filter(Payslip.employee_id == emp_b.id).first()
    if not ps_b:
        ps_b = Payslip(
            payrun_id=payrun.id,
            employee_id=emp_b.id,
            period_start=payrun.period_start,
            period_end=payrun.period_end,
            worked_days=22,
            gross_salary=75000,
            net_salary=64000,
            status="computed",
        )
        db.add(ps_b)
        db.commit()
        db.refresh(ps_b)

    return emp_a, user_a, ps_a, emp_b, user_b, ps_b


def test_employee_sees_only_own_salary_slips(db: Session):
    """Case 1 & 4: Employee A logs in -> receives only Employee A's salary slips."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    results = router_list_payslips(payrun_id=None, employee_id=None, db=db, current_user=user_a)
    assert len(results) >= 1
    for slip in results:
        assert slip.employee_id == emp_a.id
        assert slip.employee_id != emp_b.id


def test_employee_can_view_own_payslip(db: Session):
    """Case 2: Employee A can view details of their own payslip."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    result = router_get_payslip(payslip_id=ps_a.id, db=db, current_user=user_a)
    assert result.id == ps_a.id
    assert result.employee_id == emp_a.id
    assert result.gross_salary == ps_a.gross_salary
    assert result.net_salary == ps_a.net_salary


def test_employee_can_download_own_payslip_pdf(db: Session):
    """Case 3: Employee A can download their own payslip PDF."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    response = router_download_pdf(payslip_id=ps_a.id, db=db, current_user=user_a)
    assert response is not None
    assert response.status_code == 200
    assert response.media_type == "application/pdf"


def test_employee_cannot_view_other_employee_payslip_by_id(db: Session):
    """Case 7 & 9: Employee A attempts to view Employee B's payslip by ID -> 403 Forbidden."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    with pytest.raises(HTTPException) as exc_info:
        router_get_payslip(payslip_id=ps_b.id, db=db, current_user=user_a)

    assert exc_info.value.status_code == 403
    assert "Insufficient permissions" in exc_info.value.detail


def test_employee_cannot_download_other_employee_payslip_pdf(db: Session):
    """Case 8: Employee A attempts to download Employee B's payslip PDF -> 403 Forbidden."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    with pytest.raises(HTTPException) as exc_info:
        router_download_pdf(payslip_id=ps_b.id, db=db, current_user=user_a)

    assert exc_info.value.status_code == 403
    assert "Insufficient permissions" in exc_info.value.detail


def test_employee_tampering_query_param_ignored_and_scoped_to_self(db: Session):
    """Case 6: Employee A manually provides Employee B's ID in query parameters -> backend strictly scopes to Employee A."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    results = router_list_payslips(payrun_id=None, employee_id=emp_b.id, db=db, current_user=user_a)
    for slip in results:
        assert slip.employee_id == emp_a.id
        assert slip.employee_id != emp_b.id


def test_admin_and_hr_can_access_all_payslips(db: Session):
    """Case 10: Admin / HR / payroll users can view and download any employee's payslip."""
    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    hr_user = db.query(User).filter(User.username == "admin").first()
    if not hr_user:
        hr_user = User(username="admin_test_ps", password_hash="dummy", role="admin", is_active=True)
        db.add(hr_user)
        db.commit()

    # HR lists all payslips
    all_slips = router_list_payslips(payrun_id=None, employee_id=None, db=db, current_user=hr_user)
    slip_ids = [s.id for s in all_slips]
    assert ps_a.id in slip_ids
    assert ps_b.id in slip_ids

    # HR can get single payslip for any employee
    slip_a_res = router_get_payslip(payslip_id=ps_a.id, db=db, current_user=hr_user)
    assert slip_a_res.id == ps_a.id

    slip_b_res = router_get_payslip(payslip_id=ps_b.id, db=db, current_user=hr_user)
    assert slip_b_res.id == ps_b.id

    # HR can download PDF for any employee
    pdf_a = router_download_pdf(payslip_id=ps_a.id, db=db, current_user=hr_user)
    assert pdf_a.status_code == 200

    pdf_b = router_download_pdf(payslip_id=ps_b.id, db=db, current_user=hr_user)
    assert pdf_b.status_code == 200


def test_user_without_linked_employee_returns_empty_and_forbidden(db: Session):
    """Case 11: A user with no linked employee profile receives empty list and cannot access payslips."""
    unlinked_user = User(username=f"unlinked_{uuid4().hex[:8]}", password_hash="dummy", role="employee", is_active=True)
    db.add(unlinked_user)
    db.commit()
    db.refresh(unlinked_user)

    emp_a, user_a, ps_a, emp_b, user_b, ps_b = ensure_test_data(db)

    # Empty list returned
    res = router_list_payslips(payrun_id=None, employee_id=None, db=db, current_user=unlinked_user)
    assert res == []

    # 403 on get
    with pytest.raises(HTTPException) as exc_info:
        router_get_payslip(payslip_id=ps_a.id, db=db, current_user=unlinked_user)
    assert exc_info.value.status_code == 403

    # Cleanup
    db.delete(unlinked_user)
    db.commit()
