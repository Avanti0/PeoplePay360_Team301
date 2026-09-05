from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.time_off import TimeOffType, Allocation, TimeOffRequest
from app.schemas.time_off import (
    TimeOffTypeCreate, TimeOffTypeUpdate,
    AllocationCreate, AllocationUpdate,
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


def get_time_off_type(db: Session, type_id: UUID) -> TimeOffType:
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


def update_time_off_type(db: Session, type_id: UUID, data: TimeOffTypeUpdate) -> TimeOffType:
    record = get_time_off_type(db, type_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


def delete_time_off_type(db: Session, type_id: UUID) -> None:
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
# Allocations
# ---------------------------------------------------------------------

def list_allocations(db: Session, employee_id: Optional[UUID] = None) -> list[Allocation]:
    query = db.query(Allocation)
    if employee_id is not None:
        query = query.filter(Allocation.employee_id == employee_id)
    return query.order_by(Allocation.date_from.desc()).all()


def get_allocation(db: Session, allocation_id: UUID) -> Allocation:
    record = db.query(Allocation).filter(Allocation.id == allocation_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
    return record


def create_allocation(db: Session, data: AllocationCreate) -> Allocation:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")
    if not db.query(TimeOffType).filter(TimeOffType.id == data.time_off_type_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Time off type not found")

    allocation = Allocation(**data.model_dump())
    db.add(allocation)
    db.commit()
    db.refresh(allocation)
    return allocation


def update_allocation(db: Session, allocation_id: UUID, data: AllocationUpdate) -> Allocation:
    allocation = get_allocation(db, allocation_id)
    updates = data.model_dump(exclude_unset=True)

    if "number_of_days" in updates and updates["number_of_days"] < allocation.taken:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="number_of_days cannot be less than the amount already taken",
        )

    for field, value in updates.items():
        setattr(allocation, field, value)

    db.commit()
    db.refresh(allocation)
    return allocation


# ---------------------------------------------------------------------
# Time Off Requests
# ---------------------------------------------------------------------

def _resolve_allocation(
    db: Session, employee_id: UUID, time_off_type_id: UUID, date_from: date, date_to: date
) -> Optional[Allocation]:
    return (
        db.query(Allocation)
        .filter(
            Allocation.employee_id == employee_id,
            Allocation.time_off_type_id == time_off_type_id,
            Allocation.status == "approved",
            Allocation.date_from <= date_from,
            or_(Allocation.date_to.is_(None), Allocation.date_to >= date_to),
        )
        .first()
    )


def list_requests(db: Session, employee_id: Optional[UUID] = None, status_filter: Optional[str] = None) -> list[TimeOffRequest]:
    query = db.query(TimeOffRequest)
    if employee_id is not None:
        query = query.filter(TimeOffRequest.employee_id == employee_id)
    if status_filter is not None:
        query = query.filter(TimeOffRequest.status == status_filter)
    return query.order_by(TimeOffRequest.date_from.desc()).all()


def get_request(db: Session, request_id: UUID) -> TimeOffRequest:
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
        allocation = _resolve_allocation(db, data.employee_id, data.time_off_type_id, data.date_from, data.date_to)
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
        date_from=data.date_from,
        date_to=data.date_to,
        duration=data.duration,
        note=data.note,
        status="confirmed",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def update_request(db: Session, request_id: UUID, data: TimeOffRequestUpdate) -> TimeOffRequest:
    request = get_request(db, request_id)
    if request.status in ("approved", "refused"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This request has already been decided and cannot be edited",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(request, field, value)
    db.commit()
    db.refresh(request)
    return request


def approve_request(db: Session, request_id: UUID) -> TimeOffRequest:
    request = get_request(db, request_id)
    if request.status != "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only confirmed requests can be approved")

    if request.allocation_id is not None:
        allocation = get_allocation(db, request.allocation_id)
        if allocation.status != "approved":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Linked allocation is not approved")
        if allocation.remaining < request.duration:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient allocation balance")

    request.status = "approved"
    db.commit()
    db.refresh(request)
    return request


def refuse_request(db: Session, request_id: UUID) -> TimeOffRequest:
    request = get_request(db, request_id)
    if request.status != "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only confirmed requests can be refused")

    request.status = "refused"
    db.commit()
    db.refresh(request)
    return request
