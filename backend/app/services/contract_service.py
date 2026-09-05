from datetime import date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.employee import Employee
from app.schemas.contract import ContractCreate, ContractUpdate

_FAR_FUTURE = date(9999, 12, 31)


def _validate_dates(start_date: date, end_date: Optional[date]) -> None:
    if end_date is not None and end_date < start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_date must be on or after start_date")


def _validate_no_overlap(
    db: Session, employee_id: int, start_date: date, end_date: Optional[date], exclude_id: Optional[int] = None
) -> None:
    """Mirrors the DB trigger prevent_overlapping_running_contracts (schema.sql)
    so the API returns a friendly 400 instead of a raw constraint error."""
    query = db.query(Contract).filter(Contract.employee_id == employee_id, Contract.status == "running")
    if exclude_id is not None:
        query = query.filter(Contract.id != exclude_id)

    new_end = end_date or _FAR_FUTURE
    for existing in query.all():
        existing_end = existing.end_date or _FAR_FUTURE
        if start_date <= existing_end and new_end >= existing.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Overlapping running contract already exists for this employee (contract #{existing.id})",
            )


def list_contracts(db: Session, employee_id: Optional[int] = None, status_filter: Optional[str] = None) -> list[Contract]:
    query = db.query(Contract)
    if employee_id is not None:
        query = query.filter(Contract.employee_id == employee_id)
    if status_filter is not None:
        query = query.filter(Contract.status == status_filter)
    return query.order_by(Contract.employee_id, Contract.start_date).all()


def get_contract(db: Session, contract_id: int) -> Contract:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


def create_contract(db: Session, data: ContractCreate) -> Contract:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")

    _validate_dates(data.start_date, data.end_date)
    if data.status == "running":
        _validate_no_overlap(db, data.employee_id, data.start_date, data.end_date)

    contract = Contract(**data.model_dump())
    db.add(contract)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create contract — check department_id/job_position_id/working_schedule_id/salary_structure_id",
        )
    db.refresh(contract)
    return contract


def update_contract(db: Session, contract_id: int, data: ContractUpdate) -> Contract:
    contract = get_contract(db, contract_id)

    if contract.status in ("expired", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expired/cancelled contracts are historical records and cannot be edited",
        )

    updates = data.model_dump(exclude_unset=True)

    new_start = updates.get("start_date", contract.start_date)
    new_end = updates.get("end_date", contract.end_date)
    _validate_dates(new_start, new_end)

    new_status = updates.get("status", contract.status)
    if new_status == "running":
        _validate_no_overlap(db, contract.employee_id, new_start, new_end, exclude_id=contract.id)

    for field, value in updates.items():
        setattr(contract, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update contract — check referenced ids")
    db.refresh(contract)
    return contract


def delete_contract(db: Session, contract_id: int) -> None:
    contract = get_contract(db, contract_id)
    if contract.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only draft contracts can be deleted — running/expired/cancelled contracts are permanent historical records",
        )
    db.delete(contract)
    db.commit()


def resolve_contract_for_period(db: Session, employee_id: int, period_start: date, period_end: date) -> Optional[Contract]:
    """Payroll's contract-resolution rule (spec.md): the running contract
    whose validity window fully covers the payrun period. Used later by the
    payrun engine — kept here since it's core Contract business logic."""
    return (
        db.query(Contract)
        .filter(
            Contract.employee_id == employee_id,
            Contract.status == "running",
            Contract.start_date <= period_start,
            or_(Contract.end_date.is_(None), Contract.end_date >= period_end),
        )
        .first()
    )
