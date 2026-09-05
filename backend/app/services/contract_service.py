from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.employee import Employee
from app.schemas.contract import ContractCreate, ContractUpdate

_FAR_FUTURE = date(9999, 12, 31)


def _validate_dates(date_start: date, date_end: Optional[date]) -> None:
    if date_end is not None and date_end < date_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="date_end must be on or after date_start")


def _validate_no_overlap(
    db: Session, employee_id: UUID, date_start: date, date_end: Optional[date], exclude_id: Optional[UUID] = None
) -> None:
    """Mirrors the DB trigger prevent_overlapping_active_contracts (schema.sql)
    so the API returns a friendly 400 instead of a raw constraint error."""
    query = db.query(Contract).filter(Contract.employee_id == employee_id, Contract.status == "active")
    if exclude_id is not None:
        query = query.filter(Contract.id != exclude_id)

    new_end = date_end or _FAR_FUTURE
    for existing in query.all():
        existing_end = existing.date_end or _FAR_FUTURE
        if date_start <= existing_end and new_end >= existing.date_start:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Overlapping active contract already exists for this employee (contract #{existing.id})",
            )


def list_contracts(db: Session, employee_id: Optional[UUID] = None, status_filter: Optional[str] = None) -> list[Contract]:
    query = db.query(Contract)
    if employee_id is not None:
        query = query.filter(Contract.employee_id == employee_id)
    if status_filter is not None:
        query = query.filter(Contract.status == status_filter)
    return query.order_by(Contract.employee_id, Contract.date_start).all()


def get_contract(db: Session, contract_id: UUID) -> Contract:
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return contract


def create_contract(db: Session, data: ContractCreate) -> Contract:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")

    _validate_dates(data.date_start, data.date_end)
    if data.status == "active":
        _validate_no_overlap(db, data.employee_id, data.date_start, data.date_end)

    contract = Contract(**data.model_dump())
    db.add(contract)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create contract — check working_schedule_id/salary_structure_id",
        )
    db.refresh(contract)
    return contract


def update_contract(db: Session, contract_id: UUID, data: ContractUpdate) -> Contract:
    contract = get_contract(db, contract_id)

    if contract.status in ("expired", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expired/cancelled contracts are historical records and cannot be edited",
        )

    updates = data.model_dump(exclude_unset=True)

    new_start = updates.get("date_start", contract.date_start)
    new_end = updates.get("date_end", contract.date_end)
    _validate_dates(new_start, new_end)

    new_status = updates.get("status", contract.status)
    if new_status == "active":
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


def delete_contract(db: Session, contract_id: UUID) -> None:
    contract = get_contract(db, contract_id)
    if contract.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only draft contracts can be deleted — active/expired/cancelled contracts are permanent historical records",
        )
    db.delete(contract)
    db.commit()


def resolve_contract_for_period(db: Session, employee_id: UUID, period_start: date, period_end: date) -> Optional[Contract]:
    """Payroll's contract-resolution rule (spec.md): the active contract
    whose validity window fully covers the payrun period. Used later by the
    payrun engine — kept here since it's core Contract business logic."""
    return (
        db.query(Contract)
        .filter(
            Contract.employee_id == employee_id,
            Contract.status == "active",
            Contract.date_start <= period_start,
            or_(Contract.date_end.is_(None), Contract.date_end >= period_end),
        )
        .first()
    )
