from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.dashboard import EmployeeDashboardOut
from app.services import dashboard_service as svc

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/me", response_model=EmployeeDashboardOut)
def employee_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Personal dashboard data strictly for the authenticated employee."""
    return svc.get_employee_dashboard(db, current_user)


@router.get("/kpis")
def kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_kpis(db, current_user)


@router.get("/salary-by-dept")
def salary_by_dept(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_salary_by_dept(db, current_user)


@router.get("/salary-trend")
def salary_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_salary_trend(db, current_user)


@router.get("/alerts")
def alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return svc.get_alerts(db, current_user)

