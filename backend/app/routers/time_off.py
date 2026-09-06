from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_hr_manager, require_admin, is_hr_manager_or_above, current_employee_id
from app.models.user import User
from app.schemas.time_off import (
    TimeOffTypeCreate, TimeOffTypeUpdate, TimeOffTypeOut,
    AllocationCreate, AllocationUpdate, AllocationOut,
    TimeOffRequestCreate, TimeOffRequestUpdate, TimeOffRequestOut,
)
from app.services import time_off_service

# ---------------------------------------------------------------------
# Time Off Types
# ---------------------------------------------------------------------
types_router = APIRouter(prefix="/api/v1/time-off-types", tags=["time-off-types"])


@types_router.get("", response_model=List[TimeOffTypeOut])
def list_time_off_types(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    _ = Depends(get_current_user),
):
    return time_off_service.list_time_off_types(db, is_active=is_active)


@types_router.post("", response_model=TimeOffTypeOut)
def create_time_off_type(
    data: TimeOffTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_manager),
):
    if not is_hr_manager_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return time_off_service.create_time_off_type(db, data)


@types_router.get("/{type_id}", response_model=TimeOffTypeOut)
def get_time_off_type(
    type_id: UUID,
    db: Session = Depends(get_db),
    _ = Depends(get_current_user),
):
    return time_off_service.get_time_off_type(db, type_id)


@types_router.put("/{type_id}", response_model=TimeOffTypeOut)
def update_time_off_type(
    type_id: UUID,
    data: TimeOffTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_manager),
):
    if not is_hr_manager_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return time_off_service.update_time_off_type(db, type_id, data)


@types_router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_off_type(
    type_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    time_off_service.delete_time_off_type(db, type_id)


# ---------------------------------------------------------------------
# Allocations
# ---------------------------------------------------------------------
allocations_router = APIRouter(prefix="/api/v1/allocations", tags=["allocations"])


@allocations_router.get("", response_model=List[AllocationOut])
def list_allocations(
    employee_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return []
        employee_id = emp_id
    return time_off_service.list_allocations(db, employee_id=employee_id)


@allocations_router.post("", response_model=AllocationOut)
def create_allocation(
    data: AllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_manager),
):
    if not is_hr_manager_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return time_off_service.create_allocation(db, data)


@allocations_router.get("/{allocation_id}", response_model=AllocationOut)
def get_allocation(
    allocation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = time_off_service.get_allocation(db, allocation_id)
    if not is_hr_manager_or_above(current_user) and current_employee_id(current_user) != record.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return record


@allocations_router.put("/{allocation_id}", response_model=AllocationOut)
def update_allocation(
    allocation_id: UUID,
    data: AllocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_manager),
):
    if not is_hr_manager_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return time_off_service.update_allocation(db, allocation_id, data)


# ---------------------------------------------------------------------
# Time Off Requests
# ---------------------------------------------------------------------
requests_router = APIRouter(prefix="/api/v1/time-off-requests", tags=["time-off-requests"])


@requests_router.get("", response_model=List[TimeOffRequestOut])
def list_requests(
    employee_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return []
        employee_id = emp_id
    return time_off_service.list_requests(db, employee_id=employee_id, status_filter=status)


@requests_router.post("", response_model=TimeOffRequestOut)
def create_request(
    data: TimeOffRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_hr_manager_or_above(current_user):
        user_emp_id = current_employee_id(current_user)
        if not user_emp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No employee profile is linked to your user account",
            )
        if data.employee_id is not None and data.employee_id != user_emp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You may only submit time off requests for yourself",
            )
        data.employee_id = user_emp_id
    else:
        if data.employee_id is None:
            user_emp_id = current_employee_id(current_user)
            if user_emp_id:
                data.employee_id = user_emp_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Employee ID is required",
                )

    return time_off_service.create_request(db, data)


@requests_router.get("/{request_id}", response_model=TimeOffRequestOut)
def get_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = time_off_service.get_request(db, request_id)
    if not is_hr_manager_or_above(current_user) and current_employee_id(current_user) != record.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return record


@requests_router.put("/{request_id}", response_model=TimeOffRequestOut)
def update_request(
    request_id: UUID,
    data: TimeOffRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = time_off_service.get_request(db, request_id)
    if not is_hr_manager_or_above(current_user):
        if current_employee_id(current_user) != record.employee_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        if data.status in ("approved", "refused"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employees cannot approve or refuse requests")

    return time_off_service.update_request(db, request_id, data)


@requests_router.post("/{request_id}/approve", response_model=TimeOffRequestOut)
def approve_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_manager),
):
    if not is_hr_manager_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return time_off_service.approve_request(db, request_id)


@requests_router.post("/{request_id}/refuse", response_model=TimeOffRequestOut)
def refuse_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_manager),
):
    if not is_hr_manager_or_above(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return time_off_service.refuse_request(db, request_id)

