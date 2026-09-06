import pytest
from datetime import date, timedelta
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.employee import Employee
from app.models.time_off import TimeOffRequest, Allocation, TimeOffType
from app.schemas.time_off import TimeOffRequestCreate, AllocationCreate
from app.routers.time_off import (
    create_request as router_create_request,
    list_requests as router_list_requests,
    get_request as router_get_request,
    approve_request as router_approve_request,
    refuse_request as router_refuse_request,
    create_allocation as router_create_allocation,
    list_allocations as router_list_allocations,
    get_allocation as router_get_allocation,
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def get_or_create_leave_type(db: Session) -> TimeOffType:
    lt = db.query(TimeOffType).filter(TimeOffType.name == "Paid Time Off").first()
    if not lt:
        lt = TimeOffType(name="Paid Time Off", unit="days", requires_allocation=True, is_active=True)
        db.add(lt)
        db.commit()
        db.refresh(lt)
    return lt


def ensure_allocation(db: Session, employee_id, leave_type_id, days=30):
    db.query(Allocation).filter(
        Allocation.employee_id == employee_id,
        Allocation.time_off_type_id == leave_type_id,
    ).delete()
    db.commit()

    alloc = Allocation(
        employee_id=employee_id,
        time_off_type_id=leave_type_id,
        number_of_days=days,
        date_from=date(2026, 1, 1),
        date_to=date(2026, 12, 31),
        status="approved",
    )
    db.add(alloc)
    db.commit()
    db.refresh(alloc)
    return alloc


def test_self_service_leave_request_creation_for_own_account(db: Session):
    """Case 1: An employee can create a time-off request for themselves."""
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 1
    emp = all_employees[0]

    if not emp.user:
        u = User(username=f"user_to_{emp.id}", password_hash="dummy", role="employee", is_active=True)
        db.add(u)
        db.flush()
        emp.user_id = u.id
        db.commit()
    emp_user = emp.user
    emp_user.role = "employee"

    lt = get_or_create_leave_type(db)
    alloc = ensure_allocation(db, emp.id, lt.id, 30)

    start_d = date(2026, 10, 1)
    end_d = date(2026, 10, 5)

    # Clean any conflicting requests
    db.query(TimeOffRequest).filter(
        TimeOffRequest.employee_id == emp.id,
        TimeOffRequest.date_from <= end_d,
        TimeOffRequest.date_to >= start_d,
    ).delete()
    db.commit()

    # Employee submits request
    req_data = TimeOffRequestCreate(
        employee_id=emp.id,
        time_off_type_id=lt.id,
        allocation_id=alloc.id,
        date_from=start_d,
        date_to=end_d,
        duration=5,
        note="Family vacation",
    )
    result = router_create_request(data=req_data, db=db, current_user=emp_user)
    assert result is not None
    assert result.employee_id == emp.id
    assert result.status == "confirmed"
    assert result.duration == 5


def test_self_service_auto_derives_employee_id(db: Session):
    """Employee leaves employee_id as None -> backend derives from current_user."""
    all_employees = db.query(Employee).all()
    emp = all_employees[0]
    emp_user = emp.user
    emp_user.role = "employee"

    lt = get_or_create_leave_type(db)
    ensure_allocation(db, emp.id, lt.id, 30)

    start_d = date(2026, 11, 1)
    end_d = date(2026, 11, 2)

    db.query(TimeOffRequest).filter(
        TimeOffRequest.employee_id == emp.id,
        TimeOffRequest.date_from <= end_d,
        TimeOffRequest.date_to >= start_d,
    ).delete()
    db.commit()

    req_data = TimeOffRequestCreate(
        employee_id=None,
        time_off_type_id=lt.id,
        date_from=start_d,
        date_to=end_d,
        duration=2,
        note="Personal leave",
    )
    result = router_create_request(data=req_data, db=db, current_user=emp_user)
    assert result.employee_id == emp.id


def test_reject_employee_creating_request_for_another_employee(db: Session):
    """Employee A attempts to create a request for Employee B -> 403 Forbidden."""
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 2
    emp_a = all_employees[0]
    emp_b = all_employees[1]

    if not emp_a.user:
        u_a = User(username=f"user_a_{emp_a.id}", password_hash="dummy", role="employee", is_active=True)
        db.add(u_a)
        db.flush()
        emp_a.user_id = u_a.id
        db.commit()
    user_a = emp_a.user
    user_a.role = "employee"

    lt = get_or_create_leave_type(db)

    req_data = TimeOffRequestCreate(
        employee_id=emp_b.id,
        time_off_type_id=lt.id,
        date_from=date(2026, 12, 1),
        date_to=date(2026, 12, 3),
        duration=3,
    )

    with pytest.raises(HTTPException) as exc_info:
        router_create_request(data=req_data, db=db, current_user=user_a)

    assert exc_info.value.status_code == 403
    assert "You may only submit time off requests for yourself" in exc_info.value.detail


def test_employee_sees_only_own_time_off_requests(db: Session):
    """Employee listing requests only receives their own requests."""
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 2
    emp_a = all_employees[0]
    emp_b = all_employees[1]
    user_a = emp_a.user
    user_a.role = "employee"

    results = router_list_requests(employee_id=emp_b.id, status=None, db=db, current_user=user_a)
    for r in results["items"]:
        assert r.employee_id == emp_a.id


def test_employee_sees_only_own_allocations(db: Session):
    """Employee listing allocations only receives their own allocations."""
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 2
    emp_a = all_employees[0]
    emp_b = all_employees[1]
    user_a = emp_a.user
    user_a.role = "employee"

    results = router_list_allocations(employee_id=emp_b.id, db=db, current_user=user_a)
    for a in results["items"]:
        assert a.employee_id == emp_a.id


def test_employee_cannot_view_other_request_by_id(db: Session):
    """Employee A accessing Employee B's request by ID receives 403 Forbidden."""
    all_employees = db.query(Employee).all()
    emp_a = all_employees[0]
    emp_b = all_employees[1]
    user_a = emp_a.user
    user_a.role = "employee"

    lt = get_or_create_leave_type(db)
    req_b = TimeOffRequest(
        employee_id=emp_b.id,
        time_off_type_id=lt.id,
        date_from=date(2026, 12, 10),
        date_to=date(2026, 12, 12),
        duration=3,
        status="confirmed",
    )
    db.add(req_b)
    db.commit()
    db.refresh(req_b)

    with pytest.raises(HTTPException) as exc_info:
        router_get_request(request_id=req_b.id, db=db, current_user=user_a)

    assert exc_info.value.status_code == 403


def test_employee_cannot_approve_or_refuse_request(db: Session):
    """Employee attempting to approve or refuse a request receives 403 Forbidden."""
    all_employees = db.query(Employee).all()
    emp_a = all_employees[0]
    user_a = emp_a.user
    user_a.role = "employee"

    lt = get_or_create_leave_type(db)
    req = TimeOffRequest(
        employee_id=emp_a.id,
        time_off_type_id=lt.id,
        date_from=date(2026, 12, 20),
        date_to=date(2026, 12, 21),
        duration=2,
        status="confirmed",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    with pytest.raises(HTTPException) as exc_info:
        router_approve_request(request_id=req.id, db=db, current_user=user_a)
    assert exc_info.value.status_code == 403

    with pytest.raises(HTTPException) as exc_info:
        router_refuse_request(request_id=req.id, db=db, current_user=user_a)
    assert exc_info.value.status_code == 403


def test_employee_cannot_grant_allocation(db: Session):
    """Employee attempting to grant an allocation receives 403 Forbidden."""
    all_employees = db.query(Employee).all()
    emp_a = all_employees[0]
    user_a = emp_a.user
    user_a.role = "employee"

    lt = get_or_create_leave_type(db)
    alloc_data = AllocationCreate(
        employee_id=emp_a.id,
        time_off_type_id=lt.id,
        number_of_days=10,
        date_from=date(2026, 1, 1),
        status="approved",
    )

    with pytest.raises(HTTPException) as exc_info:
        router_create_allocation(data=alloc_data, db=db, current_user=user_a)
    assert exc_info.value.status_code == 403


def test_hr_manager_can_approve_and_manage_all(db: Session):
    """HR Manager can approve requests, see all requests, and grant allocations."""
    hr_user = db.query(User).filter(User.username == "admin").first()
    if not hr_user:
        hr_user = User(username="hr_test", password_hash="dummy", role="hr_manager", is_active=True)
        db.add(hr_user)
        db.commit()

    all_employees = db.query(Employee).all()
    emp = all_employees[0]
    lt = get_or_create_leave_type(db)

    # Grant allocation
    alloc_data = AllocationCreate(
        employee_id=emp.id,
        time_off_type_id=lt.id,
        number_of_days=15,
        date_from=date(2026, 1, 1),
        date_to=date(2026, 12, 31),
        status="approved",
    )
    alloc = router_create_allocation(data=alloc_data, db=db, current_user=hr_user)
    assert alloc is not None
    assert alloc.number_of_days == 15

    # Create request
    start_d = date(2026, 9, 20)
    end_d = date(2026, 9, 21)
    db.query(TimeOffRequest).filter(
        TimeOffRequest.employee_id == emp.id,
        TimeOffRequest.date_from <= end_d,
        TimeOffRequest.date_to >= start_d,
    ).delete()
    db.commit()

    req_data = TimeOffRequestCreate(
        employee_id=emp.id,
        time_off_type_id=lt.id,
        allocation_id=alloc.id,
        date_from=start_d,
        date_to=end_d,
        duration=2,
    )
    req = router_create_request(data=req_data, db=db, current_user=hr_user)
    assert req.status == "confirmed"

    # Approve request
    approved = router_approve_request(request_id=req.id, db=db, current_user=hr_user)
    assert approved.status == "approved"

    # Cleanup test request so it doesn't affect subsequent dashboard KPI tests
    db.delete(approved)
    db.commit()


def test_employee_cannot_access_other_employee_subresources(db: Session):
    """Security test: Employee A cannot access Employee B's employee profile, attendance, or time off."""
    from app.routers.employees import (
        get_employee as router_get_employee,
        list_employee_attendance as router_list_emp_attendance,
        list_employee_time_off as router_list_emp_time_off,
    )
    all_employees = db.query(Employee).all()
    assert len(all_employees) >= 2
    emp_a = all_employees[0]
    emp_b = all_employees[1]

    user_a = emp_a.user
    user_a.role = "employee"

    # Employee A can access own employee record
    own_emp = router_get_employee(employee_id=emp_a.id, db=db, _=user_a)
    assert own_emp.id == emp_a.id

    # Employee A accessing Employee B's record via ID manipulation fails with 403
    from app.core.dependencies import require_hr_manager_or_self
    with pytest.raises(HTTPException) as exc_info:
        require_hr_manager_or_self(employee_id=emp_b.id, current_user=user_a)
    assert exc_info.value.status_code == 403
