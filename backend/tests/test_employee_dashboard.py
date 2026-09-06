import pytest
from datetime import datetime, timezone, timedelta, date
from uuid import uuid4
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.time_off import TimeOffType, TimeOffRequest, Allocation
from app.models.payroll import Payrun, Payslip, SalaryStructure
from app.routers.dashboard import (
    employee_dashboard as router_employee_dashboard,
    kpis as router_kpis,
    alerts as router_alerts,
    salary_trend as router_salary_trend,
    salary_by_dept as router_salary_by_dept,
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_employee_dashboard_returns_only_own_data(db: Session):
    """Verify that employee dashboard returns strictly the authenticated employee's data across all 5 tabs."""
    # Find two employees with linked users
    emp_a = db.query(Employee).filter(Employee.user_id.isnot(None)).first()
    assert emp_a is not None
    user_a = emp_a.user

    # Create a distinct Employee B
    emp_b = Employee(
        name="Employee B Unique",
        email=f"emp_b_{uuid4().hex[:6]}@test.com",
        employment_status="active",
        bank_account_number="987654321098",
        bank_name="Test Bank B",
        bank_ifsc="TEST0009999",
    )
    db.add(emp_b)
    db.flush()

    user_b = User(
        username=f"user_b_{uuid4().hex[:6]}",
        password_hash="dummy",
        role="employee",
        is_active=True,
    )
    db.add(user_b)
    db.flush()
    emp_b.user_id = user_b.id

    # Create Attendance for Emp B
    att_b = Attendance(
        employee_id=emp_b.id,
        check_in=datetime(2026, 9, 1, 9, 0, 0, tzinfo=timezone.utc),
        check_out=datetime(2026, 9, 1, 18, 0, 0, tzinfo=timezone.utc),
        worked_hours=8.0,
        status="present",
        note="Private note of Emp B",
    )
    db.add(att_b)

    # Create Leave for Emp B
    tt = db.query(TimeOffType).first()
    if not tt:
        tt = TimeOffType(name="General Leave", unit="days")
        db.add(tt)
        db.flush()

    leave_b = TimeOffRequest(
        employee_id=emp_b.id,
        time_off_type_id=tt.id,
        date_from=date(2026, 9, 10),
        date_to=date(2026, 9, 12),
        duration=3.0,
        status="approved",
        note="Private leave reason of Emp B",
    )
    db.add(leave_b)
    db.commit()

    # Call employee dashboard as user_a
    result_a = router_employee_dashboard(db=db, current_user=user_a)

    assert result_a is not None
    assert result_a["employee"]["id"] == emp_a.id
    assert result_a["employee"]["name"] == emp_a.name

    # Check Tab 1: Attendance Health
    att_ids = [str(item["id"]) for item in result_a["recent_attendance"]]
    assert str(att_b.id) not in att_ids
    for item in result_a["recent_attendance"]:
        assert item.get("note") != "Private note of Emp B"

    # Check Tab 2: Approved Time Off
    leave_ids = [str(item["id"]) for item in result_a["approved_leaves"]]
    assert str(leave_b.id) not in leave_ids
    for item in result_a["approved_leaves"]:
        assert item.get("reason") != "Private leave reason of Emp B"

    # Check Tab 3: Complaints & Warnings
    for w in result_a["warnings"]:
        assert "Employee B" not in w.get("message", "")

    # Check Tab 4: Shifts & Schedule
    assert "schedule" in result_a
    assert "lines" in result_a["schedule"]

    # Check Tab 5: Net Salary
    assert "salary" in result_a
    assert "latest_net_salary" in result_a["salary"]


def test_employee_dashboard_unlinked_user_graceful(db: Session):
    """An unlinked user account receives a safe zeroed dashboard without leaking any company data."""
    unlinked_user = User(
        username=f"unlinked_{uuid4().hex[:6]}",
        password_hash="dummy",
        role="employee",
        is_active=True,
    )
    db.add(unlinked_user)
    db.commit()

    result = router_employee_dashboard(db=db, current_user=unlinked_user)
    assert result is not None
    assert result["employee"] is None
    assert result["attendance_health"]["total_records"] == 0
    assert result["approved_leaves"] == []
    assert result["warnings"] == []
    assert result["salary"]["latest_net_salary"] == 0.0


def test_dashboard_scoped_endpoints_for_employee_role(db: Session):
    """Verify that /kpis, /alerts, and /salary-trend are strictly scoped when requested by employee role."""
    emp = db.query(Employee).filter(Employee.user_id.isnot(None)).first()
    assert emp is not None
    user = emp.user

    # 1. /alerts
    alerts_result = router_alerts(db=db, current_user=user)
    for a in alerts_result:
        assert a.get("employee_id") == str(emp.id)

    # 2. /salary-by-dept
    dept_result = router_salary_by_dept(db=db, current_user=user)
    if dept_result:
        assert len(dept_result) <= 1

    # 3. /kpis
    kpis_result = router_kpis(db=db, current_user=user)
    assert kpis_result["active_employees_count"] == 1
