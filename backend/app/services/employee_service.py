from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


def _validate_manager(db: Session, manager_id: Optional[UUID]) -> None:
    if manager_id is None:
        return
    manager = db.query(Employee).filter(Employee.id == manager_id).first()
    if not manager:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager not found")
    if manager.employment_status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Manager must be an active employee")


def list_employees(
    db: Session,
    department: Optional[str] = None,
    employment_status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: Optional[int] = None,
) -> dict:
    query = db.query(Employee)
    if department is not None:
        query = query.filter(Employee.department == department)
    if employment_status is not None:
        query = query.filter(Employee.employment_status == employment_status)
    if search:
        like = f"%{search}%"
        query = query.filter(or_(Employee.name.ilike(like), Employee.email.ilike(like)))
    query = query.order_by(Employee.name)

    total = query.count()

    if limit is None:
        items = query.all()
        return {"items": items, "total": total, "page": 1, "limit": total or 1, "total_pages": 1}

    page = max(1, page)
    total_pages = max(1, -(-total // limit))  # ceiling division
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "total": total, "page": page, "limit": limit, "total_pages": total_pages}


def get_employee(db: Session, employee_id: UUID) -> Employee:
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
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
            detail="Could not create employee — check manager_id/working_schedule_id/user_id",
        )
    db.refresh(employee)
    return employee


def update_employee(db: Session, employee_id: UUID, data: EmployeeUpdate) -> Employee:
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


def deactivate_employee(db: Session, employee_id: UUID) -> Employee:
    """Soft-delete: deactivating an employee never removes their historical
    records (contracts, attendance, time off, payslips)."""
    employee = get_employee(db, employee_id)
    employee.employment_status = "inactive"
    db.commit()
    db.refresh(employee)
    return employee
