from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.time_off import TimeOffRequest, LeaveAllocation
from app.models.payroll import Payslip, PayrollWarning, Payrun
from app.models.contract import Contract
from app.models.department import Department


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

    # Pending leave requests
    pending_leave = db.query(func.count(TimeOffRequest.id)).filter(
        TimeOffRequest.status == "confirmed"
    ).scalar()

    # Attendance health: % of records with no exception (status = present)
    total_att = db.query(func.count(Attendance.id)).scalar() or 1
    present_att = db.query(func.count(Attendance.id)).filter(
        Attendance.status == "present"
    ).scalar()
    attendance_health = round((present_att / total_att) * 100, 1)

    # Unresolved warnings (payslips not yet paid)
    unresolved = db.query(func.count(PayrollWarning.id)).join(Payslip).filter(
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
        "unresolved_warnings_count": unresolved,
    }


def get_salary_by_dept(db: Session) -> list[dict]:
    rows = (
        db.query(
            Department.name.label("department"),
            func.coalesce(func.sum(Payslip.net_salary), 0).label("cost"),
            func.count(func.distinct(Payslip.employee_id)).label("employee_count"),
        )
        .join(Contract, Contract.department_id == Department.id)
        .join(Payslip, Payslip.contract_id == Contract.id)
        .filter(Payslip.status == "paid")
        .group_by(Department.name)
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
            func.coalesce(func.sum(Payslip.total_deductions), 0).label("deductions"),
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
            "deductions": float(r.deductions),
        }
        for r in rows
    ]


def get_alerts(db: Session) -> list[dict]:
    rows = (
        db.query(PayrollWarning, Payslip, Employee)
        .join(Payslip, PayrollWarning.payslip_id == Payslip.id)
        .join(Employee, Payslip.employee_id == Employee.id)
        .filter(Payslip.status.notin_(["paid"]))
        .order_by(PayrollWarning.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": w.id,
            "payslip_id": ps.id,
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "warning_type": w.warning_type,
            "message": w.message,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w, ps, emp in rows
    ]
