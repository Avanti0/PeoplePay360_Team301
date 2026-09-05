from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import require_hr_manager, require_admin
from app.schemas.contract import ContractCreate, ContractUpdate, ContractOut, ContractStatus
from app.services import contract_service

router = APIRouter(prefix="/api/v1/contracts", tags=["contracts"], dependencies=[Depends(require_hr_manager)])


@router.get("", response_model=List[ContractOut])
def list_contracts(
    employee_id: Optional[UUID] = Query(None),
    status_filter: Optional[ContractStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    return contract_service.list_contracts(
        db, employee_id=employee_id, status_filter=status_filter.value if status_filter else None
    )


@router.post("", response_model=ContractOut)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    return contract_service.create_contract(db, data)


@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: UUID, db: Session = Depends(get_db)):
    return contract_service.get_contract(db, contract_id)


@router.put("/{contract_id}", response_model=ContractOut)
def update_contract(contract_id: UUID, data: ContractUpdate, db: Session = Depends(get_db)):
    return contract_service.update_contract(db, contract_id, data)


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_contract(contract_id: UUID, db: Session = Depends(get_db)):
    contract_service.delete_contract(db, contract_id)
