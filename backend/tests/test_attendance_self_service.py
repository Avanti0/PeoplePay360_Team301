import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.schemas.attendance import AttendanceCreate
from app.routers.attendance import create_attendance as router_create_attendance, list_attendance as router_list_attendance
from app.services import attendance_service


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_self_service_attendance_allowed_for_own_account(db: Session):
    """Case 1: Employee A logs in -> can record punch for Employee A."""
    # Find employee with linked user account
    employee = db.query(Employee).filter(Employee.user_id.isnot(None)).first()
    assert employee is not None
    assert employee.user is not None
    emp_user = employee.user

    # Clean any attendance for test target date
    target_dt = datetime(2026, 9, 5, 9, 0, 0, tzinfo=timezone.utc)
    db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.check_in >= datetime(2026, 9, 5, 0, 0, 0, tzinfo=timezone.utc),
        Attendance.check_in <= datetime(2026, 9, 5, 23, 59, 59, tzinfo=timezone.utc),
    ).delete()
    db.commit()

    # Employee records punch (Clock-in)
    data = AttendanceCreate(
        employee_id=employee.id,
        check_in=target_dt,
        status="present",
        note="Self check-in",
    )
    result = router_create_attendance(data=data, db=db, current_user=emp_user)
    assert result is not None
    assert result.employee_id == employee.id
    assert result.check_in is not None
    assert result.check_out is None

    # Employee records punch again on same day (Clock-out sequencing)
    checkout_data = AttendanceCreate(
        employee_id=employee.id,
        check_in=target_dt,
        check_out=target_dt + timedelta(hours=8, minutes=30),
        status="present",
        note="Self check-out",
    )
    result_out = router_create_attendance(data=checkout_data, db=db, current_user=emp_user)
    assert result_out.id == result.id
    assert result_out.check_out is not None
    assert result_out.worked_hours == 8.5


def test_self_service_auto_derives_employee_id_when_omitted(db: Session):
    """Employee doesn't need to specify employee_id; backend derives it from authenticated session."""
    employee = db.query(Employee).filter(Employee.user_id.isnot(None)).first()
    assert employee is not None
    emp_user = employee.user

    # Clean attendance for test date
    target_dt = datetime(2026, 9, 6, 9, 0, 0, tzinfo=timezone.utc)
    db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.check_in >= datetime(2026, 9, 6, 0, 0, 0, tzinfo=timezone.utc),
        Attendance.check_in <= datetime(2026, 9, 6, 23, 59, 59, tzinfo=timezone.utc),
    ).delete()
    db.commit()

    # data has employee_id=None
    data = AttendanceCreate(
        employee_id=None,
        check_in=target_dt,
        status="present",
    )
    result = router_create_attendance(data=data, db=db, current_user=emp_user)
    assert result.employee_id == employee.id


def test_reject_employee_tampering_other_employee_id(db: Session):
    """Case 4 & 6: Employee A manually changes employee ID in API request -> Backend rejects with 403 Forbidden."""
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 2
    emp_a = all_employees[0]
    emp_b = all_employees[1]

    # Ensure emp_a has a regular employee user
    if not emp_a.user:
        user_a = User(username=f"user_{emp_a.id}", password_hash="dummy", role="employee", is_active=True)
        db.add(user_a)
        db.flush()
        emp_a.user_id = user_a.id
        db.commit()
    user_a = emp_a.user
    user_a.role = "employee"

    # User A tries to submit a punch with Employee B's employee_id
    tampered_data = AttendanceCreate(
        employee_id=emp_b.id,
        check_in=datetime.now(timezone.utc),
        status="present",
    )

    with pytest.raises(HTTPException) as exc_info:
        router_create_attendance(data=tampered_data, db=db, current_user=user_a)

    assert exc_info.value.status_code == 403
    assert "You may only record attendance for yourself" in exc_info.value.detail


def test_admin_and_hr_can_record_attendance_for_other_employees(db: Session):
    """Case 5: Admin / HR logs in -> existing authorized attendance functionality remains available."""
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(username="admin_test", password_hash="dummy", role="admin", is_active=True)
        db.add(admin_user)
        db.commit()

    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 1
    target_emp = all_employees[0]

    # Clean target employee attendance for test date
    target_dt = datetime(2026, 9, 7, 9, 0, 0, tzinfo=timezone.utc)
    db.query(Attendance).filter(
        Attendance.employee_id == target_emp.id,
        Attendance.check_in >= datetime(2026, 9, 7, 0, 0, 0, tzinfo=timezone.utc),
        Attendance.check_in <= datetime(2026, 9, 7, 23, 59, 59, tzinfo=timezone.utc),
    ).delete()
    db.commit()

    admin_data = AttendanceCreate(
        employee_id=target_emp.id,
        check_in=target_dt,
        status="present",
        note="Recorded by Admin",
    )
    result = router_create_attendance(data=admin_data, db=db, current_user=admin_user)
    assert result.employee_id == target_emp.id


def test_employee_attendance_list_strictly_scoped_to_self(db: Session):
    """Employee A calling list_attendance cannot view other employees' records."""
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 2
    emp_a = all_employees[0]
    emp_b = all_employees[1]

    if not emp_a.user:
        user_a = User(username=f"user_{emp_a.id}", password_hash="dummy", role="employee", is_active=True)
        db.add(user_a)
        db.flush()
        emp_a.user_id = user_a.id
        db.commit()
    user_a = emp_a.user
    user_a.role = "employee"

    # User A attempts to query Employee B's records
    results = router_list_attendance(employee_id=emp_b.id, db=db, current_user=user_a)
    for rec in results["items"]:
        # Every returned record must strictly belong to User A's employee
        assert rec.employee_id == emp_a.id
