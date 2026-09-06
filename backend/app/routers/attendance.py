from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_hr_manager, require_admin, is_hr_manager_or_above, current_employee_id
from app.models.user import User
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceOut, AttendancePage
from app.services import attendance_service

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])

ALLOWED_LIMITS = {10, 25, 50, 100}
DEFAULT_LIMIT = 10


@router.get("", response_model=AttendancePage)
def list_attendance(
    employee_id: Optional[UUID] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = 1,
    limit: int = DEFAULT_LIMIT,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return {"items": [], "total": 0, "page": 1, "limit": DEFAULT_LIMIT, "total_pages": 1}
        employee_id = emp_id
    clean_date_from = date_from if isinstance(date_from, date) else None
    clean_date_to = date_to if isinstance(date_to, date) else None
    if limit not in ALLOWED_LIMITS:
        limit = DEFAULT_LIMIT
    return attendance_service.list_attendance(
        db, employee_id=employee_id, date_from=clean_date_from, date_to=clean_date_to, page=page, limit=limit
    )


@router.post("", response_model=AttendanceOut)
def create_attendance(
    data: AttendanceCreate,
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
                detail="You may only record attendance for yourself",
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

    return attendance_service.create_attendance(db, data)


@router.get("/{attendance_id}", response_model=AttendanceOut)
def get_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = attendance_service.get_attendance(db, attendance_id)
    if not is_hr_manager_or_above(current_user) and current_employee_id(current_user) != record.employee_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return record


@router.put("/{attendance_id}", response_model=AttendanceOut, dependencies=[Depends(require_hr_manager)])
def update_attendance(
    attendance_id: UUID,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
):
    return attendance_service.update_attendance(db, attendance_id, data)


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_attendance(attendance_id: UUID, db: Session = Depends(get_db)):
    attendance_service.delete_attendance(db, attendance_id)
