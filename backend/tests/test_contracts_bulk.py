import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.employee import Employee
from app.models.contract import Contract
from app.schemas.contract import (
    BulkContractCreate, BulkContractUpdate, BulkContractDelete, ContractStatus
)
from app.services.contract_service import (
    bulk_create_contracts, bulk_update_contracts, bulk_delete_contracts
)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def test_bulk_create_contracts_success_and_overlap(db: Session):
    employees = db.query(Employee).limit(3).all()
    assert len(employees) >= 2
    emp_ids = [e.id for e in employees]

    # Create draft contracts for all selected employees
    create_data = BulkContractCreate(
        employee_ids=emp_ids,
        date_start=date(2027, 1, 1),
        date_end=date(2027, 12, 31),
        wage=Decimal("750000.00"),
        status=ContractStatus.draft,
    )
    result = bulk_create_contracts(db, create_data)
    assert result.operation == "bulk_create"
    assert result.total == len(emp_ids)
    assert result.success_count == len(emp_ids)
    assert result.failed_count == 0

    # Clean up created draft contracts
    for cid in result.success_ids:
        c = db.query(Contract).filter(Contract.id == cid).first()
        if c:
            db.delete(c)
    db.commit()


def test_bulk_create_active_overlap_reporting(db: Session):
    # Rahul Sharma has an active open-ended contract from 2026-01-01
    rahul = db.query(Employee).filter(Employee.email == "rahul.sharma@peoplepay360.demo").first()
    assert rahul is not None

    create_data = BulkContractCreate(
        employee_ids=[rahul.id],
        date_start=date(2026, 6, 1),
        date_end=date(2026, 12, 31),
        wage=Decimal("800000.00"),
        status=ContractStatus.active,
    )
    result = bulk_create_contracts(db, create_data)
    assert result.total == 1
    assert result.success_count == 0
    assert result.failed_count == 1
    assert "Overlapping active contract" in result.failures[0].reason


def test_bulk_update_contracts_selective_fields(db: Session):
    # Create 2 draft contracts to test bulk update
    emp = db.query(Employee).first()
    assert emp is not None

    c1 = Contract(
        employee_id=emp.id,
        date_start=date(2028, 1, 1),
        date_end=date(2028, 6, 30),
        wage=Decimal("500000.00"),
        department="Engineering",
        status="draft",
    )
    c2 = Contract(
        employee_id=emp.id,
        date_start=date(2028, 7, 1),
        date_end=date(2028, 12, 31),
        wage=Decimal("550000.00"),
        department="Engineering",
        status="draft",
    )
    db.add_all([c1, c2])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)

    # Bulk update only the wage and department, keeping dates untouched
    update_data = BulkContractUpdate(
        contract_ids=[c1.id, c2.id],
        wage=Decimal("620000.00"),
        department="Product",
        update_wage=True,
        update_department=True,
        update_date_start=False,
        update_date_end=False,
    )
    result = bulk_update_contracts(db, update_data)
    assert result.success_count == 2
    assert result.failed_count == 0

    db.refresh(c1)
    db.refresh(c2)
    assert c1.wage == Decimal("620000.00")
    assert c1.department == "Product"
    assert c1.date_start == date(2028, 1, 1)  # Unchanged
    assert c2.wage == Decimal("620000.00")
    assert c2.department == "Product"
    assert c2.date_start == date(2028, 7, 1)  # Unchanged

    # Clean up
    db.delete(c1)
    db.delete(c2)
    db.commit()


def test_bulk_delete_payslip_protection(db: Session):
    # Contract with payslips attached
    contract_with_payslip = db.query(Contract).filter(Contract.payslips.any()).first()
    if not contract_with_payslip:
        # Fallback to any non-draft contract
        contract_with_payslip = db.query(Contract).filter(Contract.status != "draft").first()
    assert contract_with_payslip is not None

    result = bulk_delete_contracts(db, BulkContractDelete(contract_ids=[contract_with_payslip.id]))
    assert result.total == 1
    assert result.success_count == 0
    assert result.failed_count == 1
    assert "Cannot delete" in result.failures[0].reason or "Only draft contracts" in result.failures[0].reason

