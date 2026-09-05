from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_hr_manager, require_admin, is_hr_manager_or_above
from app.models.user import User
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceOut
from app.services import attendance_service

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])


@router.get("", response_model=List[AttendanceOut], dependencies=[Depends(require_hr_manager)])
def list_attendance(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    return attendance_service.list_attendance(db, employee_id=employee_id, date_from=date_from, date_to=date_to)


@router.post("", response_model=AttendanceOut)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_hr_manager_or_above(current_user) and current_user.employee_id != data.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only record your own attendance")
    return attendance_service.create_attendance(db, data)


@router.get("/{attendance_id}", response_model=AttendanceOut)
def get_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = attendance_service.get_attendance(db, attendance_id)
    if not is_hr_manager_or_above(current_user) and current_user.employee_id != record.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return record


@router.put("/{attendance_id}", response_model=AttendanceOut, dependencies=[Depends(require_hr_manager)])
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return attendance_service.update_attendance(db, attendance_id, data, corrected_by=current_user.employee_id)


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    attendance_service.delete_attendance(db, attendance_id)
