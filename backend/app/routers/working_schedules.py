from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import require_hr_manager, require_admin
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate, WorkingScheduleOut
from app.services import working_schedule_service as svc

router = APIRouter(prefix="/api/v1/working-schedules", tags=["working-schedules"])


@router.get("", response_model=list[WorkingScheduleOut])
def list_schedules(db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.list_schedules(db)


@router.post("", response_model=WorkingScheduleOut, status_code=201)
def create_schedule(data: WorkingScheduleCreate, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.create_schedule(db, data)


@router.get("/{schedule_id}", response_model=WorkingScheduleOut)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.get_schedule(db, schedule_id)


@router.put("/{schedule_id}", response_model=WorkingScheduleOut)
def update_schedule(schedule_id: int, data: WorkingScheduleUpdate, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return svc.update_schedule(db, schedule_id, data)


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    svc.delete_schedule(db, schedule_id)
