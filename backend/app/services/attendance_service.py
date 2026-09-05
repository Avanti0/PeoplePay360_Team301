from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.attendance import Attendance
from app.models.employee import Employee
from app.models.working_schedule import WorkingSchedule
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate


def _compute_worked_hours(check_in: Optional[datetime], check_out: Optional[datetime]) -> Optional[Decimal]:
    if check_in is None or check_out is None or check_out <= check_in:
        return None
    hours = (check_out - check_in).total_seconds() / 3600
    return Decimal(str(round(hours, 2)))


def _with_employee_schedule(query):
    """Eager-load employee -> working_schedule -> lines in one query so
    Attendance.employee_name / expected_working_day don't trigger N+1 lookups."""
    return query.options(
        joinedload(Attendance.employee).joinedload(Employee.working_schedule).joinedload(WorkingSchedule.lines)
    )


def list_attendance(
    db: Session,
    employee_id: Optional[UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[Attendance]:
    query = _with_employee_schedule(db.query(Attendance))
    if employee_id is not None:
        query = query.filter(Attendance.employee_id == employee_id)
    # attendance has no separate "work_date" column - the day is derived
    # from check_in (see schema.sql / docs/modules/attendance.md).
    if date_from is not None:
        query = query.filter(func.date(Attendance.check_in) >= date_from)
    if date_to is not None:
        query = query.filter(func.date(Attendance.check_in) <= date_to)
    return query.order_by(Attendance.check_in.desc()).all()


def get_attendance(db: Session, attendance_id: UUID) -> Attendance:
    record = _with_employee_schedule(db.query(Attendance)).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    return record


def create_attendance(db: Session, data: AttendanceCreate) -> Attendance:
    if not db.query(Employee).filter(Employee.id == data.employee_id).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee not found")

    now_dt = datetime.now(timezone.utc)
    check_in_val = data.check_in or now_dt
    target_date = check_in_val.date()

    existing_record = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == data.employee_id,
            func.date(Attendance.check_in) == target_date,
        )
        .first()
    )

    if existing_record:
        # If the existing record is missing check_out, this punch completes the shift by checking out
        if existing_record.check_out is None:
            checkout_val = data.check_out or now_dt
            if checkout_val <= existing_record.check_in:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Check-out time cannot be earlier than or equal to check-in time",
                )
            existing_record.check_out = checkout_val
            existing_record.worked_hours = _compute_worked_hours(existing_record.check_in, existing_record.check_out)
            if data.note:
                existing_record.note = (
                    f"{existing_record.note} | {data.note}" if existing_record.note else data.note
                )
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not record check-out")
            return get_attendance(db, existing_record.id)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attendance record already exists and is completed for this date",
            )

    record = Attendance(
        employee_id=data.employee_id,
        check_in=check_in_val,
        check_out=data.check_out,
        status=data.status,
        note=data.note,
        is_manual=False,
    )
    record.worked_hours = _compute_worked_hours(record.check_in, record.check_out)
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create attendance record")
    db.commit()
    return get_attendance(db, record.id)


def update_attendance(db: Session, attendance_id: UUID, data: AttendanceUpdate) -> Attendance:
    """Only HR Manager+ can reach this (router-enforced). Per the module's
    business rule, every edit here counts as a manual correction:
    is_manual is forced true."""
    record = get_attendance(db, attendance_id)
    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(record, field, value)

    record.worked_hours = _compute_worked_hours(record.check_in, record.check_out)
    record.is_manual = True

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not update attendance record")
    db.refresh(record)
    return record


def delete_attendance(db: Session, attendance_id: UUID) -> None:
    record = get_attendance(db, attendance_id)
    db.delete(record)
    db.commit()
