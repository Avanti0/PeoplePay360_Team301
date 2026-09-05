from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.employee import Employee
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate


def _compute_worked_hours(check_in: Optional[datetime], check_out: Optional[datetime]) -> Decimal:
    if check_in is None or check_out is None or check_out <= check_in:
        return Decimal("0")
    hours = (check_out - check_in).total_seconds() / 3600
    return Decimal(str(round(hours, 2)))


def list_attendance(
    db: Session,
    employee_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[Attendance]:
    query = db.query(Attendance)
    if employee_id is not None:
        query = query.filter(Attendance.employee_id == employee_id)
    if date_from is not None:
        query = query.filter(Attendance.work_date >= date_from)
    if date_to is not None:
        query = query.filter(Attendance.work_date <= date_to)
    return query.order_by(Attendance.work_date.desc()).all()


def get_attendance(db: Session, attendance_id: int) -> Attendance:
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    return record


def create_attendance(db: Session, data: AttendanceCreate) -> Attendance:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")
    if db.query(Attendance).filter(
        Attendance.employee_id == data.employee_id, Attendance.work_date == data.work_date
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance record already exists for this employee on this date",
        )

    record = Attendance(**data.model_dump())
    record.worked_hours = _compute_worked_hours(data.check_in, data.check_out)
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create attendance record")
    db.refresh(record)
    return record


def update_attendance(db: Session, attendance_id: int, data: AttendanceUpdate, corrected_by: Optional[int]) -> Attendance:
    """Only HR Manager+ can reach this (router-enforced). Per the module's
    business rule, every edit here counts as a manual correction:
    is_manual_correction is forced true and corrected_by stamped automatically."""
    record = get_attendance(db, attendance_id)
    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(record, field, value)

    record.worked_hours = _compute_worked_hours(record.check_in, record.check_out)
    record.is_manual_correction = True
    record.corrected_by = corrected_by

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update attendance record")
    db.refresh(record)
    return record


def delete_attendance(db: Session, attendance_id: int) -> None:
    record = get_attendance(db, attendance_id)
    db.delete(record)
    db.commit()
