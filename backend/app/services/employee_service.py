from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


def _validate_manager(db: Session, manager_id: Optional[int]) -> None:
    if manager_id is None:
        return
    manager = db.query(Employee).filter(Employee.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager not found")
    if manager.employment_status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager must be an active employee")


def list_employees(
    db: Session,
    department_id: Optional[int] = None,
    employment_status: Optional[str] = None,
) -> list[Employee]:
    query = db.query(Employee)
    if department_id is not None:
        query = query.filter(Employee.department_id == department_id)
    if employment_status is not None:
        query = query.filter(Employee.employment_status == employment_status)
    return query.order_by(Employee.id).all()


def get_employee(db: Session, employee_id: int) -> Employee:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    if db.query(Employee).filter(Employee.employee_code == data.employee_code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="employee_code already exists")
    if db.query(Employee).filter(Employee.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email already exists")
    _validate_manager(db, data.manager_id)

    employee = Employee(**data.model_dump())
    db.add(employee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create employee — check department_id/job_position_id/working_schedule_id/role_id",
        )
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee:
    employee = get_employee(db, employee_id)
    updates = data.model_dump(exclude_unset=True)

    if "email" in updates and updates["email"] != employee.email:
        if db.query(Employee).filter(Employee.email == updates["email"]).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email already exists")

    if "manager_id" in updates:
        if updates["manager_id"] == employee_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee cannot be their own manager")
        _validate_manager(db, updates["manager_id"])

    for field, value in updates.items():
        setattr(employee, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update employee — check referenced ids",
        )
    db.refresh(employee)
    return employee


def deactivate_employee(db: Session, employee_id: int) -> Employee:
    """Soft-delete: deactivating an employee never removes their historical
    records (contracts, attendance, time off, payslips)."""
    employee = get_employee(db, employee_id)
    employee.employment_status = "inactive"
    db.commit()
    db.refresh(employee)
    return employee
