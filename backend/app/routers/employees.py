from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import require_hr_manager, require_admin, require_hr_manager_or_self
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmploymentStatus
from app.schemas.contract import ContractOut
from app.schemas.attendance import AttendanceOut
from app.schemas.time_off import TimeOffRequestOut
from app.services import employee_service, contract_service, attendance_service, time_off_service

router = APIRouter(prefix="/api/v1/employees", tags=["employees"])


@router.get("", response_model=List[EmployeeOut], dependencies=[Depends(require_hr_manager)])
def list_employees(
    department_id: Optional[int] = Query(None),
    employment_status: Optional[EmploymentStatus] = Query(None),
    db: Session = Depends(get_db),
):
    status_value = employment_status.value if employment_status else None
    return employee_service.list_employees(db, department_id=department_id, employment_status=status_value)


@router.post("", response_model=EmployeeOut, dependencies=[Depends(require_hr_manager)])
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    return employee_service.create_employee(db, data)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db), _=Depends(require_hr_manager_or_self)):
    return employee_service.get_employee(db, employee_id)


@router.put("/{employee_id}", response_model=EmployeeOut, dependencies=[Depends(require_hr_manager)])
def update_employee(employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    return employee_service.update_employee(db, employee_id, data)


@router.delete("/{employee_id}", response_model=EmployeeOut, dependencies=[Depends(require_admin)])
def deactivate_employee(employee_id: int, db: Session = Depends(get_db)):
    return employee_service.deactivate_employee(db, employee_id)


@router.get("/{employee_id}/contracts", response_model=List[ContractOut], dependencies=[Depends(require_hr_manager)])
def list_employee_contracts(employee_id: int, db: Session = Depends(get_db)):
    employee_service.get_employee(db, employee_id)  # 404 if the employee doesn't exist
    return contract_service.list_contracts(db, employee_id=employee_id)


@router.get("/{employee_id}/attendance", response_model=List[AttendanceOut])
def list_employee_attendance(employee_id: int, db: Session = Depends(get_db), _=Depends(require_hr_manager_or_self)):
    employee_service.get_employee(db, employee_id)  # 404 if the employee doesn't exist
    return attendance_service.list_attendance(db, employee_id=employee_id)


@router.get("/{employee_id}/time-off", response_model=List[TimeOffRequestOut])
def list_employee_time_off(employee_id: int, db: Session = Depends(get_db), _=Depends(require_hr_manager_or_self)):
    employee_service.get_employee(db, employee_id)  # 404 if the employee doesn't exist
    return time_off_service.list_requests(db, employee_id=employee_id)
