from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.time_off import TimeOffType, LeaveAllocation, TimeOffRequest
from app.schemas.time_off import (
    TimeOffTypeCreate, TimeOffTypeUpdate,
    LeaveAllocationCreate, LeaveAllocationUpdate,
    TimeOffRequestCreate, TimeOffRequestUpdate,
)


# ---------------------------------------------------------------------
# Time Off Types
# ---------------------------------------------------------------------

def list_time_off_types(db: Session, is_active: Optional[bool] = None) -> list[TimeOffType]:
    query = db.query(TimeOffType)
    if is_active is not None:
        query = query.filter(TimeOffType.is_active == is_active)
    return query.order_by(TimeOffType.name).all()


def get_time_off_type(db: Session, type_id: int) -> TimeOffType:
    record = db.query(TimeOffType).filter(TimeOffType.id == type_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off type not found")
    return record


def create_time_off_type(db: Session, data: TimeOffTypeCreate) -> TimeOffType:
    if db.query(TimeOffType).filter(TimeOffType.name == data.name).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Time off type name already exists")
    record = TimeOffType(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_time_off_type(db: Session, type_id: int, data: TimeOffTypeUpdate) -> TimeOffType:
    record = get_time_off_type(db, type_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


def delete_time_off_type(db: Session, type_id: int) -> None:
    record = get_time_off_type(db, type_id)
    try:
        db.delete(record)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a time off type with existing allocations/requests — deactivate it instead",
        )


# ---------------------------------------------------------------------
# Leave Allocations
# ---------------------------------------------------------------------

def _remaining(allocation: LeaveAllocation) -> Decimal:
    return allocation.allocated_amount - allocation.taken_amount


def list_allocations(db: Session, employee_id: Optional[int] = None) -> list[LeaveAllocation]:
    query = db.query(LeaveAllocation)
    if employee_id is not None:
        query = query.filter(LeaveAllocation.employee_id == employee_id)
    return query.order_by(LeaveAllocation.valid_from.desc()).all()


def get_allocation(db: Session, allocation_id: int) -> LeaveAllocation:
    record = db.query(LeaveAllocation).filter(LeaveAllocation.id == allocation_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
    return record


def create_allocation(db: Session, data: LeaveAllocationCreate) -> LeaveAllocation:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")
    if not db.query(TimeOffType).filter(TimeOffType.id == data.time_off_type_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Time off type not found")

    allocation = LeaveAllocation(**data.model_dump())
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    return allocation


def update_allocation(
    db: Session, allocation_id: int, data: LeaveAllocationUpdate, approver_id: Optional[int]
) -> LeaveAllocation:
    allocation = get_allocation(db, allocation_id)
    updates = data.model_dump(exclude_unset=True)

    if "allocated_amount" in updates and updates["allocated_amount"] < allocation.taken_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="allocated_amount cannot be less than the amount already taken",
        )

    for field, value in updates.items():
        setattr(allocation, field, value)

    if updates.get("status") == "approved":
        allocation.approved_by = approver_id

    db.commit()
    db.refresh(allocation)
    return allocation


# ---------------------------------------------------------------------
# Time Off Requests
# ---------------------------------------------------------------------

def _resolve_allocation(
    db: Session, employee_id: int, time_off_type_id: int, start_date: date, end_date: date
) -> Optional[LeaveAllocation]:
    return (
        db.query(LeaveAllocation)
        .filter(
            LeaveAllocation.employee_id == employee_id,
            LeaveAllocation.time_off_type_id == time_off_type_id,
            LeaveAllocation.status == "approved",
            LeaveAllocation.valid_from <= start_date,
            or_(LeaveAllocation.valid_to.is_(None), LeaveAllocation.valid_to >= end_date),
        )
        .first()
    )


def list_requests(db: Session, employee_id: Optional[int] = None, status_filter: Optional[str] = None) -> list[TimeOffRequest]:
    query = db.query(TimeOffRequest)
    if employee_id is not None:
        query = query.filter(TimeOffRequest.employee_id == employee_id)
    if status_filter is not None:
        query = query.filter(TimeOffRequest.status == status_filter)
    return query.order_by(TimeOffRequest.start_date.desc()).all()


def get_request(db: Session, request_id: int) -> TimeOffRequest:
    record = db.query(TimeOffRequest).filter(TimeOffRequest.id == request_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time off request not found")
    return record


def create_request(db: Session, data: TimeOffRequestCreate) -> TimeOffRequest:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")

    time_off_type = db.query(TimeOffType).filter(TimeOffType.id == data.time_off_type_id).first()
    if not time_off_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Time off type not found")
    if not time_off_type.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Time off type is not active")

    allocation_id = None
    if time_off_type.requires_allocation:
        allocation = _resolve_allocation(db, data.employee_id, data.time_off_type_id, data.start_date, data.end_date)
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No approved allocation covers this period for this time off type",
            )
        allocation_id = allocation.id

    request = TimeOffRequest(
        employee_id=data.employee_id,
        time_off_type_id=data.time_off_type_id,
        allocation_id=allocation_id,
        start_date=data.start_date,
        end_date=data.end_date,
        duration=data.duration,
        reason=data.reason,
        status="submitted",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_request(db: Session, request_id: int, data: TimeOffRequestUpdate) -> TimeOffRequest:
    request = get_request(db, request_id)
    if request.status in ("approved", "refused", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This request has already been decided and cannot be edited",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(request, field, value)
    db.commit()
    db.refresh(request)
    return request


def approve_request(db: Session, request_id: int, approver_id: Optional[int]) -> TimeOffRequest:
    request = get_request(db, request_id)
    if request.status != "submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted requests can be approved")

    if request.allocation_id is not None:
        allocation = get_allocation(db, request.allocation_id)
        if allocation.status != "approved":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked allocation is not approved")
        if _remaining(allocation) < request.duration:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient allocation balance")
        allocation.taken_amount += request.duration

    request.status = "approved"
    request.approved_by = approver_id
    request.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    return request


def refuse_request(db: Session, request_id: int, approver_id: Optional[int]) -> TimeOffRequest:
    request = get_request(db, request_id)
    if request.status != "submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted requests can be refused")

    request.status = "refused"
    request.approved_by = approver_id
    request.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    return request
