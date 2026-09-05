from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.time_off import TimeOffRequest
from app.models.payroll import Payslip, Payrun
from app.models.contract import Contract


def get_kpis(db: Session) -> dict:
    # Total net salary from paid payslips
    total_net = db.query(func.coalesce(func.sum(Payslip.net_salary), 0)).filter(
        Payslip.status == "paid"
    ).scalar()

    # Payslips generated (all time)
    payslips_generated = db.query(func.count(Payslip.id)).scalar()

    # Average salary from paid payslips
    avg_salary = db.query(func.coalesce(func.avg(Payslip.net_salary), 0)).filter(
        Payslip.status == "paid"
    ).scalar()

    # Active employees
    active_employees = db.query(func.count(Employee.id)).filter(
        Employee.employment_status == "active"
    ).scalar()

    # Approved time off days
    approved_days = db.query(func.coalesce(func.sum(TimeOffRequest.duration), 0)).filter(
        TimeOffRequest.status == "approved"
    ).scalar()

    # Pending leave requests (submitted but not yet decided)
    pending_leave = db.query(func.count(TimeOffRequest.id)).filter(
        TimeOffRequest.status == "confirmed"
    ).scalar()

    # Attendance health: % of records with no exception (status = present)
    total_att = db.query(func.count(Attendance.id)).scalar() or 1
    present_att = db.query(func.count(Attendance.id)).filter(
        Attendance.status == "present"
    ).scalar()
    attendance_health = round((present_att / total_att) * 100, 1)

    # Unresolved warnings: non-empty warnings array on any not-yet-paid payslip
    unresolved = db.query(func.coalesce(func.sum(func.jsonb_array_length(Payslip.warnings)), 0)).filter(
        Payslip.status.notin_(["paid"])
    ).scalar()

    return {
        "total_net_salary_paid": float(total_net),
        "payslips_generated": payslips_generated,
        "average_salary": float(avg_salary),
        "approved_time_off_days": float(approved_days),
        "attendance_health_percentage": attendance_health,
        "active_employees_count": active_employees,
        "pending_leave_requests_count": pending_leave,
        "unresolved_warnings_count": int(unresolved),
    }


def get_salary_by_dept(db: Session) -> list[dict]:
    rows = (
        db.query(
            Contract.department.label("department"),
            func.coalesce(func.sum(Payslip.net_salary), 0).label("cost"),
            func.count(func.distinct(Payslip.employee_id)).label("employee_count"),
        )
        .join(Payslip, Payslip.contract_id == Contract.id)
        .filter(Payslip.status == "paid")
        .group_by(Contract.department)
        .order_by(func.sum(Payslip.net_salary).desc())
        .all()
    )
    return [{"department": r.department, "cost": float(r.cost), "employee_count": r.employee_count}
            for r in rows]


def get_salary_trend(db: Session) -> list[dict]:
    rows = (
        db.query(
            extract("year", Payrun.period_start).label("year"),
            extract("month", Payrun.period_start).label("month"),
            func.coalesce(func.sum(Payslip.gross_salary), 0).label("gross"),
            func.coalesce(func.sum(Payslip.net_salary), 0).label("net"),
        )
        .join(Payslip, Payslip.payrun_id == Payrun.id)
        .filter(Payrun.status == "paid")
        .group_by("year", "month")
        .order_by("year", "month")
        .limit(6)
        .all()
    )
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return [
        {
            "month": f"{month_names[int(r.month) - 1]} {int(r.year)}",
            "gross": float(r.gross),
            "net": float(r.net),
            "deductions": float(r.gross) - float(r.net),
        }
        for r in rows
    ]


def get_alerts(db: Session) -> list[dict]:
    """Payslip.warnings is a JSONB list of plain message strings (schema.sql
    dropped the separate payroll_warnings table) — one alert row per string."""
    payslips = (
        db.query(Payslip, Employee)
        .join(Employee, Payslip.employee_id == Employee.id)
        .filter(Payslip.status.notin_(["paid"]))
        .filter(func.jsonb_array_length(Payslip.warnings) > 0)
        .order_by(Payslip.created_at.desc())
        .limit(20)
        .all()
    )
    alerts = []
    for ps, emp in payslips:
        for i, message in enumerate(ps.warnings or []):
            alerts.append({
                "id": f"{ps.id}:{i}",
                "payslip_id": ps.id,
                "employee_id": emp.id,
                "employee_name": emp.name,
                "warning_type": "payroll_warning",
                "message": message,
            })
    return alerts[:20]
