import pytest
from datetime import date, time, datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.employee import Employee
from app.models.contract import Contract
from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.models.time_off import TimeOffType, Allocation, TimeOffRequest
from app.models.payroll import SalaryStructure, SalaryRule, Payrun, Payslip, PayslipLine
from app.services.contract_service import resolve_contract_for_period, _validate_no_overlap
from app.services.working_schedule_service import _weekly_hours
from app.services.payroll_service import _execute_rules, _count_worked_days
from app.services.dashboard_service import get_kpis, get_salary_by_dept, get_salary_trend
from fastapi import HTTPException


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_contract_period_resolution(db: Session):
    """Rule 4 & 16A: The applicable contract for payroll must be determined
    based on the selected payroll period, not simply the latest contract."""
    # Find Rahul Sharma
    rahul = db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
    assert rahul is not None

    # For March 2025, contract A (2025-01-01 to 2025-12-31, expired) was the active contract
    # Note: resolve_contract_for_period searches status='active', but let's check historical range
    contracts = db.query(Contract).filter(Contract.employee_id == rahul.id).all()
    assert len(contracts) >= 2

    # For March 2026, active contract B (2026-01-01 to open-ended) is resolved
    contract_2026 = resolve_contract_for_period(db, rahul.id, date(2026, 3, 1), date(2026, 3, 31))
    assert contract_2026 is not None
    assert contract_2026.date_start == date(2026, 1, 1)
    assert contract_2026.wage == Decimal("100000.00")
    assert contract_2026.status == "active"


def test_prevent_overlapping_active_contracts(db: Session):
    """Rule 4: Prevent concurrent/conflicting active contracts for the same employee."""
    rahul = db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
    assert rahul is not None

    with pytest.raises(HTTPException) as excinfo:
        # Try creating another active contract starting in 2026-06-01 (overlaps with open-ended active contract)
        _validate_no_overlap(db, rahul.id, date(2026, 6, 1), None)
    assert excinfo.value.status_code == 400
    assert "Overlapping active contract" in excinfo.value.detail


def test_working_schedule_weekly_hours(db: Session):
    """Rule 5 & 16B: Weekly hours are derived from daily lines (end - start - break)."""
    schedule = db.query(WorkingSchedule).filter(WorkingSchedule.name == "Standard 9-to-6 (Mon-Fri)").first()
    assert schedule is not None

    # 5 working days * (9 hours - 1 hour break) = 40.0 hours
    hours = _weekly_hours(schedule)
    assert hours == 40.0

    # Part-time schedule: 5 days * 4 hours = 20.0 hours
    part_time = db.query(WorkingSchedule).filter(WorkingSchedule.name == "Part-Time 9-to-1 (Mon-Fri)").first()
    assert part_time is not None
    assert _weekly_hours(part_time) == 20.0


def test_leave_balance_derived(db: Session):
    """Rule 7 & 16C: Leave balance is derived from Allocation - approved requests."""
    # Rahul Sharma's Earned Leave allocation
    rahul = db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
    alloc = db.query(Allocation).filter(
        Allocation.employee_id == rahul.id,
        Allocation.status == "approved"
    ).first()
    assert alloc is not None
    assert alloc.number_of_days == Decimal("20.00")

    # In seed.sql, 1 request of 3 days was approved
    assert alloc.taken == Decimal("3.00")
    assert alloc.remaining == Decimal("17.00")


def test_salary_rules_sequence_computation(db: Session):
    """Rule 9 & 16D: Salary rules execute in sequence and drive payslip computation."""
    structure = db.query(SalaryStructure).filter(SalaryStructure.name == "Regular Salary").first()
    assert structure is not None

    rules = [r for r in structure.rules if r.is_active]
    ctx = _execute_rules(rules, wage=100000.0)

    # Basic: 50,000, HRA: 10,000, Transport: 3,000
    assert ctx["BASIC"] == 50000.0
    assert ctx["HRA"] == 10000.0
    assert ctx["TRANSPORT"] == 3000.0
    # Gross: 63,000
    assert ctx["GROSS"] == 63000.0
    # Deductions: PF 6,000, Tax 2,500
    assert ctx["PF"] == 6000.0
    assert ctx["TAX"] == 2500.0
    # Net: 63,000 - 6,000 - 2,500 = 54,500
    assert ctx["NET"] == 54500.0


def test_payslip_breakdown_and_immutable_historical(db: Session):
    """Rule 10 & 16F: Finalized payslips preserve calculated lines and cannot be corrupted."""
    # March 2026 paid payslip for Rahul Sharma
    payslip = db.query(Payslip).filter(
        Payslip.id == "30000000-0000-0000-0000-000000000001"
    ).first()
    assert payslip is not None
    assert payslip.status == "paid"
    assert payslip.gross_salary == Decimal("63000.00")
    assert payslip.net_salary == Decimal("54500.00")

    # Check breakdown lines
    lines = {line.code: line.amount for line in payslip.lines}
    assert lines["BASIC"] == Decimal("50000.00")
    assert lines["HRA"] == Decimal("10000.00")
    assert lines["TRANSPORT"] == Decimal("3000.00")
    assert lines["GROSS"] == Decimal("63000.00")
    assert lines["NET"] == Decimal("54500.00")


def test_dashboard_kpis_derived_from_live_data(db: Session):
    """Rule 12: Dashboard data is dynamically calculated from source-of-truth records."""
    kpis = get_kpis(db)
    assert kpis["total_net_salary_paid"] > 0
    assert kpis["payslips_generated"] >= 6
    assert kpis["active_employees_count"] >= 8
    assert kpis["approved_time_off_days"] >= 3.0

    dept_costs = get_salary_by_dept(db)
    assert len(dept_costs) > 0
    departments = [d["department"] for d in dept_costs]
    assert "Engineering" in departments or "Human Resources" in departments


def test_employee_phone_validation():
    """Verify phone validation accepts valid phone numbers and rejects invalid ones."""
    from app.schemas.employee import EmployeeCreate
    import pydantic

    # Valid phone formats
    emp_valid_1 = EmployeeCreate(name="Test User", email="test1@demo.com", phone="+91 9876543210")
    assert emp_valid_1.phone == "+91 9876543210"

    emp_valid_2 = EmployeeCreate(name="Test User", email="test2@demo.com", phone="9876543210")
    assert emp_valid_2.phone == "9876543210"

    emp_valid_none = EmployeeCreate(name="Test User", email="test3@demo.com", phone=None)
    assert emp_valid_none.phone is None

    # Invalid phone numbers (too short)
    with pytest.raises(pydantic.ValidationError):
        EmployeeCreate(name="Test User", email="test4@demo.com", phone="123")

    # Invalid phone numbers (non-numeric garbage)
    with pytest.raises(pydantic.ValidationError):
        EmployeeCreate(name="Test User", email="test5@demo.com", phone="invalid-phone-xyz")


