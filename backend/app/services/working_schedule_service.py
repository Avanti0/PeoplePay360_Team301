from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.working_schedule import WorkingSchedule, WorkingScheduleLine
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate


def _weekly_hours(schedule: WorkingSchedule) -> float:
    total = 0.0
    for line in schedule.lines:
        if line.is_working_day and line.start_time and line.end_time:
            start = line.start_time.hour * 60 + line.start_time.minute
            end   = line.end_time.hour   * 60 + line.end_time.minute
            total += max(0, (end - start - line.break_minutes) / 60)
    return round(total, 2)


def _to_out(schedule: WorkingSchedule) -> dict:
    return {**schedule.__dict__, "weekly_hours": _weekly_hours(schedule)}


def list_schedules(db: Session):
    return [_to_out(s) for s in db.query(WorkingSchedule).order_by(WorkingSchedule.name).all()]


def get_schedule(db: Session, schedule_id: int):
    obj = db.query(WorkingSchedule).filter(WorkingSchedule.id == schedule_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Working schedule not found")
    return _to_out(obj)


def create_schedule(db: Session, data: WorkingScheduleCreate):
    obj = WorkingSchedule(name=data.name, schedule_type=data.schedule_type)
    db.add(obj)
    db.flush()
    for line in data.lines:
        db.add(WorkingScheduleLine(schedule_id=obj.id, **line.model_dump()))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Schedule name must be unique or duplicate day_of_week in lines")
    db.refresh(obj)
    return _to_out(obj)


def update_schedule(db: Session, schedule_id: int, data: WorkingScheduleUpdate):
    obj = db.query(WorkingSchedule).filter(WorkingSchedule.id == schedule_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Working schedule not found")

    for k, v in data.model_dump(exclude_unset=True, exclude={"lines"}).items():
        setattr(obj, k, v)

    if data.lines is not None:
        for line in obj.lines:
            db.delete(line)
        db.flush()
        for line in data.lines:
            db.add(WorkingScheduleLine(schedule_id=obj.id, **line.model_dump()))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Duplicate day_of_week in lines")
    db.refresh(obj)
    return _to_out(obj)


def delete_schedule(db: Session, schedule_id: int):
    obj = db.query(WorkingSchedule).filter(WorkingSchedule.id == schedule_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Working schedule not found")
    try:
        db.delete(obj)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete — schedule is assigned to employees or contracts")
