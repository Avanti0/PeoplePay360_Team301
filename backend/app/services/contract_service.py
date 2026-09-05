from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.contract import Contract
from app.models.employee import Employee
from app.schemas.contract import (
    ContractCreate, ContractUpdate,
    BulkContractCreate, BulkContractUpdate, BulkContractDelete,
    BulkOperationResult, BulkFailureDetail,
)

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
    query = db.query(Contract).options(joinedload(Contract.employee))
    if employee_id is not None:
        query = query.filter(Contract.employee_id == employee_id)
    if status_filter is not None:
        query = query.filter(Contract.status == status_filter)
    return query.order_by(Contract.employee_id, Contract.date_start).all()


def get_contract(db: Session, contract_id: UUID) -> Contract:
    contract = (
        db.query(Contract)
        .options(joinedload(Contract.employee))
        .filter(Contract.id == contract_id)
        .first()
    )
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


def bulk_create_contracts(db: Session, data: BulkContractCreate) -> BulkOperationResult:
    total = len(data.employee_ids)
    success_ids = []
    failures = []

    _validate_dates(data.date_start, data.date_end)

    for emp_id in data.employee_ids:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            failures.append(BulkFailureDetail(id=emp_id, name="Unknown Employee", reason="Employee not found in database"))
            continue

        # Check overlap if active
        status_val = data.status.value if hasattr(data.status, "value") else str(data.status)
        if status_val == "active":
            query = db.query(Contract).filter(Contract.employee_id == emp_id, Contract.status == "active")
            new_end = data.date_end or _FAR_FUTURE
            has_overlap = False
            for existing in query.all():
                existing_end = existing.date_end or _FAR_FUTURE
                if data.date_start <= existing_end and new_end >= existing.date_start:
                    has_overlap = True
                    end_str = str(existing.date_end) if existing.date_end else "open-ended"
                    failures.append(BulkFailureDetail(
                        id=emp_id,
                        name=emp.name,
                        reason=f"Overlapping active contract already exists (#{str(existing.id)[:8]}, {existing.date_start} to {end_str})",
                    ))
                    break
            if has_overlap:
                continue

        try:
            contract = Contract(
                employee_id=emp_id,
                date_start=data.date_start,
                date_end=data.date_end,
                wage=data.wage,
                department=data.department or emp.department,
                job_position=data.job_position or emp.job_position,
                working_schedule_id=data.working_schedule_id or emp.working_schedule_id,
                salary_structure_id=data.salary_structure_id,
                status=status_val,
            )
            db.add(contract)
            db.flush()
            success_ids.append(contract.id)
        except Exception as e:
            failures.append(BulkFailureDetail(id=emp_id, name=emp.name, reason=str(e)))

    if success_ids:
        db.commit()

    return BulkOperationResult(
        operation="bulk_create",
        total=total,
        success_count=len(success_ids),
        failed_count=len(failures),
        success_ids=success_ids,
        failures=failures,
    )


def bulk_update_contracts(db: Session, data: BulkContractUpdate) -> BulkOperationResult:
    total = len(data.contract_ids)
    success_ids = []
    failures = []

    for cid in data.contract_ids:
        contract = db.query(Contract).options(joinedload(Contract.employee)).filter(Contract.id == cid).first()
        if not contract:
            failures.append(BulkFailureDetail(id=cid, name="Unknown Contract", reason="Contract record not found"))
            continue

        emp_name = contract.employee_name or "Employee"

        if contract.status in ("expired", "cancelled") and not data.update_status:
            failures.append(BulkFailureDetail(
                id=cid,
                name=emp_name,
                reason="Expired/cancelled contracts are historical records and cannot be edited",
            ))
            continue

        new_start = data.date_start if (data.update_date_start and data.date_start is not None) else contract.date_start
        new_end = data.date_end if data.update_date_end else contract.date_end
        if data.update_date_end and data.date_end is None:
            new_end = None

        if new_end is not None and new_end < new_start:
            failures.append(BulkFailureDetail(
                id=cid,
                name=emp_name,
                reason=f"End date ({new_end}) must be on or after start date ({new_start})",
            ))
            continue

        new_status = data.status.value if (data.update_status and data.status) else contract.status
        if new_status == "active":
            query = db.query(Contract).filter(Contract.employee_id == contract.employee_id, Contract.status == "active", Contract.id != contract.id)
            eff_end = new_end or _FAR_FUTURE
            has_overlap = False
            for existing in query.all():
                existing_end = existing.date_end or _FAR_FUTURE
                if new_start <= existing_end and eff_end >= existing.date_start:
                    has_overlap = True
                    failures.append(BulkFailureDetail(
                        id=cid,
                        name=emp_name,
                        reason=f"Update would create overlap with active contract #{str(existing.id)[:8]}",
                    ))
                    break
            if has_overlap:
                continue

        try:
            if data.update_date_start and data.date_start is not None:
                contract.date_start = data.date_start
            if data.update_date_end:
                contract.date_end = data.date_end
            if data.update_wage and data.wage is not None:
                contract.wage = data.wage
            if data.update_department and data.department is not None:
                contract.department = data.department
            if data.update_job_position and data.job_position is not None:
                contract.job_position = data.job_position
            if data.update_working_schedule_id:
                contract.working_schedule_id = data.working_schedule_id
            if data.update_salary_structure_id:
                contract.salary_structure_id = data.salary_structure_id
            if data.update_status and data.status:
                contract.status = data.status.value if hasattr(data.status, "value") else str(data.status)

            db.flush()
            success_ids.append(contract.id)
        except Exception as e:
            failures.append(BulkFailureDetail(id=cid, name=emp_name, reason=str(e)))

    if success_ids:
        db.commit()

    return BulkOperationResult(
        operation="bulk_update",
        total=total,
        success_count=len(success_ids),
        failed_count=len(failures),
        success_ids=success_ids,
        failures=failures,
    )


def bulk_delete_contracts(db: Session, data: BulkContractDelete) -> BulkOperationResult:
    total = len(data.contract_ids)
    success_ids = []
    failures = []

    for cid in data.contract_ids:
        contract = db.query(Contract).options(joinedload(Contract.employee), joinedload(Contract.payslips)).filter(Contract.id == cid).first()
        if not contract:
            failures.append(BulkFailureDetail(id=cid, name="Unknown Contract", reason="Contract record not found"))
            continue

        emp_name = contract.employee_name or "Employee"

        # Check if contract is referenced by payslips
        if contract.payslips and len(contract.payslips) > 0:
            failures.append(BulkFailureDetail(
                id=cid,
                name=emp_name,
                reason=f"Cannot delete: Contract is referenced by {len(contract.payslips)} historical payslip record(s). Archived payroll data must remain intact.",
            ))
            continue

        if contract.status != "draft":
            failures.append(BulkFailureDetail(
                id=cid,
                name=emp_name,
                reason=f"Only draft contracts can be hard-deleted. Contract is in {contract.status} state — please archive or cancel instead.",
            ))
            continue

        try:
            db.delete(contract)
            db.flush()
            success_ids.append(cid)
        except Exception as e:
            failures.append(BulkFailureDetail(id=cid, name=emp_name, reason=str(e)))

    if success_ids:
        db.commit()

    return BulkOperationResult(
        operation="bulk_delete",
        total=total,
        success_count=len(success_ids),
        failed_count=len(failures),
        success_ids=success_ids,
        failures=failures,
    )
