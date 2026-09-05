from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import require_hr_payroll_user
from app.services import dashboard_service as svc

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/kpis")
def kpis(db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.get_kpis(db)


@router.get("/salary-by-dept")
def salary_by_dept(db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.get_salary_by_dept(db)


@router.get("/salary-trend")
def salary_trend(db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.get_salary_trend(db)


@router.get("/alerts")
def alerts(db: Session = Depends(get_db), _=Depends(require_hr_payroll_user)):
    return svc.get_alerts(db)
