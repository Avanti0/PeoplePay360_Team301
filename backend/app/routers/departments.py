from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.core.dependencies import require_hr_manager, require_admin
from app.models.department import Department
from app.models.job_position import JobPosition

# ── Schemas ───────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    manager_id: Optional[int] = None

class DepartmentOut(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    manager_id: Optional[int] = None
    class Config: from_attributes = True

class JobPositionCreate(BaseModel):
    title: str
    department_id: Optional[int] = None

class JobPositionOut(BaseModel):
    id: int
    title: str
    department_id: Optional[int] = None
    class Config: from_attributes = True


# ── Departments Router ────────────────────────────────────────────────────────

dept_router = APIRouter(prefix="/api/v1/departments", tags=["departments"])

@dept_router.get("", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    return db.query(Department).order_by(Department.name).all()

@dept_router.post("", response_model=DepartmentOut, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    obj = Department(**data.model_dump())
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Department name or code already exists")
    db.refresh(obj)
    return obj

@dept_router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentCreate, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    obj = db.query(Department).filter(Department.id == dept_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit(); db.refresh(obj)
    return obj

@dept_router.delete("/{dept_id}", status_code=204)
def delete_department(dept_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = db.query(Department).filter(Department.id == dept_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found")
    try:
        db.delete(obj); db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete — department has employees or job positions")


# ── Job Positions Router ──────────────────────────────────────────────────────

job_router = APIRouter(prefix="/api/v1/job-positions", tags=["job-positions"])

@job_router.get("", response_model=list[JobPositionOut])
def list_job_positions(department_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    q = db.query(JobPosition)
    if department_id:
        q = q.filter(JobPosition.department_id == department_id)
    return q.order_by(JobPosition.title).all()

@job_router.post("", response_model=JobPositionOut, status_code=201)
def create_job_position(data: JobPositionCreate, db: Session = Depends(get_db), _=Depends(require_hr_manager)):
    obj = JobPosition(**data.model_dump())
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Job position already exists in this department")
    db.refresh(obj)
    return obj

@job_router.delete("/{job_id}", status_code=204)
def delete_job_position(job_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Job position not found")
    try:
        db.delete(obj); db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete — job position is assigned to employees or contracts")
