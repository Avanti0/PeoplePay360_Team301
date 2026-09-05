from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_user, require_hr_manager, require_admin, require_hr_manager_or_self
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeePage, EmploymentStatus
from app.schemas.contract import ContractOut
from app.schemas.attendance import AttendanceOut
from app.schemas.time_off import TimeOffRequestOut
from app.services import employee_service, contract_service, attendance_service, time_off_service

router = APIRouter(prefix="/api/v1/employees", tags=["employees"])

ALLOWED_LIMITS = {10, 25, 50, 100}
DEFAULT_LIMIT = 10


@router.get("", response_model=EmployeePage)
def list_employees(
    department: Optional[str] = Query(None),
    employment_status: Optional[EmploymentStatus] = Query(None),
    status: Optional[str] = Query(None, description="active | inactive | all (alias used by frontend)"),
    search: Optional[str] = Query(None, description="matches employee name or email"),
    page: int = Query(1),
    limit: int = Query(DEFAULT_LIMIT),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Resolve effective employment_status filter
    # `status` param (active/inactive/all) takes precedence over `employment_status`
    if status is not None:
        if status == "all":
            effective_status = None
        elif status in ("active", "inactive", "on_leave"):
            effective_status = status
        else:
            effective_status = "active"  # invalid → default
    elif employment_status is not None:
        effective_status = employment_status.value
    else:
        # Default: active only
        effective_status = "active"

    # Sanitise limit
    if limit not in ALLOWED_LIMITS:
        limit = DEFAULT_LIMIT

    return employee_service.list_employees(
        db,
        department=department,
        employment_status=effective_status,
        search=search,
        page=page,
        limit=limit,
    )


@router.post("", response_model=EmployeeOut, dependencies=[Depends(require_hr_manager)])
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    return employee_service.create_employee(db, data)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_manager_or_self)):
    return employee_service.get_employee(db, employee_id)


@router.put("/{employee_id}", response_model=EmployeeOut, dependencies=[Depends(require_hr_manager)])
def update_employee(employee_id: UUID, data: EmployeeUpdate, db: Session = Depends(get_db)):
    return employee_service.update_employee(db, employee_id, data)


@router.delete("/{employee_id}", response_model=EmployeeOut, dependencies=[Depends(require_admin)])
def deactivate_employee(employee_id: UUID, db: Session = Depends(get_db)):
    return employee_service.deactivate_employee(db, employee_id)


@router.get("/{employee_id}/contracts", response_model=List[ContractOut], dependencies=[Depends(require_hr_manager)])
def list_employee_contracts(employee_id: UUID, db: Session = Depends(get_db)):
    employee_service.get_employee(db, employee_id)  # 404 if the employee doesn't exist
    return contract_service.list_contracts(db, employee_id=employee_id)


@router.get("/{employee_id}/attendance", response_model=List[AttendanceOut])
def list_employee_attendance(employee_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_manager_or_self)):
    employee_service.get_employee(db, employee_id)  # 404 if the employee doesn't exist
    return attendance_service.list_attendance(db, employee_id=employee_id)


@router.get("/{employee_id}/time-off", response_model=List[TimeOffRequestOut])
def list_employee_time_off(employee_id: UUID, db: Session = Depends(get_db), _=Depends(require_hr_manager_or_self)):
    employee_service.get_employee(db, employee_id)  # 404 if the employee doesn't exist
    return time_off_service.list_requests(db, employee_id=employee_id)
