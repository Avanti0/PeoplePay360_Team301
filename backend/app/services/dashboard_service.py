from datetime import date, datetime
from typing import Optional
from uuid import UUID
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.time_off import TimeOffRequest, Allocation, TimeOffType
from app.models.payroll import Payslip, Payrun, PayslipLine
from app.models.contract import Contract
from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.core.dependencies import is_hr_manager_or_above, current_employee_id


def get_kpis(db: Session, current_user: Optional[User] = None) -> dict:
    if current_user and not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return {
                "total_net_salary_paid": 0.0,
                "payslips_generated": 0,
                "average_salary": 0.0,
                "approved_time_off_days": 0.0,
                "attendance_health_percentage": 100.0,
                "active_employees_count": 1,
                "pending_leave_requests_count": 0,
                "unresolved_warnings_count": 0,
            }

        total_net = db.query(func.coalesce(func.sum(Payslip.net_salary), 0)).filter(
            Payslip.employee_id == emp_id,
            Payslip.status == "paid"
        ).scalar()
        payslips_generated = db.query(func.count(Payslip.id)).filter(
            Payslip.employee_id == emp_id
        ).scalar()
        avg_salary = db.query(func.coalesce(func.avg(Payslip.net_salary), 0)).filter(
            Payslip.employee_id == emp_id,
            Payslip.status == "paid"
        ).scalar()
        approved_days = db.query(func.coalesce(func.sum(TimeOffRequest.duration), 0)).filter(
            TimeOffRequest.employee_id == emp_id,
            TimeOffRequest.status == "approved"
        ).scalar()
        pending_leave = db.query(func.count(TimeOffRequest.id)).filter(
            TimeOffRequest.employee_id == emp_id,
            TimeOffRequest.status == "confirmed"
        ).scalar()
        total_att = db.query(func.count(Attendance.id)).filter(
            Attendance.employee_id == emp_id
        ).scalar() or 1
        present_att = db.query(func.count(Attendance.id)).filter(
            Attendance.employee_id == emp_id,
            Attendance.status == "present"
        ).scalar()
        attendance_health = round((present_att / total_att) * 100, 1)
        unresolved = db.query(func.coalesce(func.sum(func.jsonb_array_length(Payslip.warnings)), 0)).filter(
            Payslip.employee_id == emp_id,
            Payslip.status.notin_(["paid"])
        ).scalar()

        return {
            "total_net_salary_paid": float(total_net),
            "payslips_generated": payslips_generated,
            "average_salary": float(avg_salary),
            "approved_time_off_days": float(approved_days),
            "attendance_health_percentage": attendance_health,
            "active_employees_count": 1,
            "pending_leave_requests_count": pending_leave,
            "unresolved_warnings_count": int(unresolved),
        }

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


def get_salary_by_dept(db: Session, current_user: Optional[User] = None) -> list[dict]:
    if current_user and not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return []
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        dept_name = emp.department if emp and emp.department else "Personal"
        cost = db.query(func.coalesce(func.sum(Payslip.net_salary), 0)).filter(
            Payslip.employee_id == emp_id,
            Payslip.status == "paid"
        ).scalar()
        return [{"department": dept_name, "cost": float(cost), "employee_count": 1}]

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


def get_salary_trend(db: Session, current_user: Optional[User] = None) -> list[dict]:
    query = (
        db.query(
            extract("year", Payrun.period_start).label("year"),
            extract("month", Payrun.period_start).label("month"),
            func.coalesce(func.sum(Payslip.gross_salary), 0).label("gross"),
            func.coalesce(func.sum(Payslip.net_salary), 0).label("net"),
        )
        .join(Payslip, Payslip.payrun_id == Payrun.id)
        .filter(Payrun.status == "paid")
    )

    if current_user and not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return []
        query = query.filter(Payslip.employee_id == emp_id)

    rows = (
        query
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


def get_alerts(db: Session, current_user: Optional[User] = None) -> list[dict]:
    """Payslip.warnings is a JSONB list of plain message strings."""
    query = (
        db.query(Payslip, Employee)
        .join(Employee, Payslip.employee_id == Employee.id)
        .filter(Payslip.status.notin_(["paid"]))
        .filter(func.jsonb_array_length(Payslip.warnings) > 0)
    )

    if current_user and not is_hr_manager_or_above(current_user):
        emp_id = current_employee_id(current_user)
        if not emp_id:
            return []
        query = query.filter(Payslip.employee_id == emp_id)

    payslips = (
        query
        .order_by(Payslip.created_at.desc())
        .limit(20)
        .all()
    )
    alerts = []
    for ps, emp in payslips:
        for i, message in enumerate(ps.warnings or []):
            alerts.append({
                "id": f"{ps.id}:{i}",
                "payslip_id": str(ps.id),
                "employee_id": str(emp.id),
                "employee_name": emp.name,
                "warning_type": "payroll_warning",
                "message": message,
            })
    return alerts[:20]


def get_employee_dashboard(db: Session, current_user: User) -> dict:
    """Returns strictly personal metrics, logs, schedules, and payroll info
    for the authenticated employee."""
    emp_id = current_employee_id(current_user)
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    if not emp_id:
        return {
            "employee": None,
            "attendance_health": {
                "attendance_health_percentage": 100.0,
                "total_records": 0,
                "present_days": 0,
                "late_days": 0,
                "absent_or_other_days": 0,
                "total_hours_worked": 0.0,
            },
            "recent_attendance": [],
            "approved_leaves": [],
            "leave_allocations": [],
            "total_approved_leave_days": 0.0,
            "warnings": [],
            "schedule": {
                "schedule_id": None,
                "schedule_name": "Standard Schedule (Mon-Fri 09:00-18:00)",
                "weekly_working_days": 5,
                "total_weekly_hours": 40.0,
                "lines": [
                    {
                        "day_of_week": i,
                        "day_name": day_names[i],
                        "is_working_day": i < 5,
                        "start_time": "09:00:00" if i < 5 else None,
                        "end_time": "18:00:00" if i < 5 else None,
                        "break_minutes": 60 if i < 5 else 0,
                        "daily_hours": 8.0 if i < 5 else 0.0,
                    }
                    for i in range(7)
                ],
            },
            "salary": {
                "latest_net_salary": 0.0,
                "latest_gross_salary": 0.0,
                "latest_deductions": 0.0,
                "average_net_salary": 0.0,
                "total_payouts_count": 0,
                "currency": "INR",
                "bank_name": None,
                "bank_account_masked": None,
                "bank_ifsc": None,
                "monthly_trend": [],
                "latest_payslip_lines": [],
            },
        }

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        return get_employee_dashboard(db, None)

    # 1. Attendance Health & Logs (ONLY this employee)
    att_records = (
        db.query(Attendance)
        .filter(Attendance.employee_id == emp_id)
        .order_by(Attendance.check_in.desc().nullslast())
        .all()
    )
    total_att = len(att_records)
    present_count = sum(1 for a in att_records if a.status == "present")
    late_count = sum(1 for a in att_records if a.status == "late")
    absent_or_other = total_att - present_count - late_count
    total_hours = sum(float(a.worked_hours or 0) for a in att_records)
    health_pct = round((present_count / total_att * 100), 1) if total_att > 0 else 100.0

    recent_attendance = [
        {
            "id": a.id,
            "check_in": a.check_in,
            "check_out": a.check_out,
            "worked_hours": float(a.worked_hours) if a.worked_hours is not None else None,
            "status": a.status,
            "is_manual": a.is_manual,
            "note": a.note,
            "expected_working_day": a.expected_working_day,
        }
        for a in att_records[:20]
    ]

    # 2. Approved Time Off & Allocations (ONLY this employee)
    approved_requests = (
        db.query(TimeOffRequest)
        .filter(TimeOffRequest.employee_id == emp_id, TimeOffRequest.status == "approved")
        .order_by(TimeOffRequest.date_from.desc())
        .all()
    )
    total_approved_leave_days = sum(float(r.duration) for r in approved_requests)

    approved_leaves = [
        {
            "id": r.id,
            "time_off_type_name": r.time_off_type.name if r.time_off_type else "Leave",
            "date_from": r.date_from,
            "date_to": r.date_to,
            "duration": float(r.duration),
            "status": r.status,
            "reason": r.note,
        }
        for r in approved_requests
    ]

    allocations = db.query(Allocation).filter(Allocation.employee_id == emp_id).all()
    leave_allocations = [
        {
            "id": alloc.id,
            "time_off_type_name": alloc.time_off_type.name if alloc.time_off_type else "Leave",
            "unit": alloc.time_off_type.unit if alloc.time_off_type else "days",
            "allocated_days": float(alloc.number_of_days),
            "taken_days": float(alloc.taken),
            "remaining_days": float(alloc.remaining),
        }
        for alloc in allocations
    ]

    # 3. Complaints & Warnings (ONLY this employee)
    emp_payslips = (
        db.query(Payslip)
        .filter(Payslip.employee_id == emp_id)
        .order_by(Payslip.period_start.desc())
        .all()
    )
    warnings = []
    for ps in emp_payslips:
        for idx, msg in enumerate(ps.warnings or []):
            warnings.append({
                "id": f"{ps.id}:{idx}",
                "title": "Payroll Notice",
                "message": msg,
                "warning_type": "payroll_notice",
                "severity": "warning",
                "created_at": ps.created_at,
                "source": f"Payrun Period {ps.period_start} to {ps.period_end}",
                "status": "resolved" if ps.status == "paid" else "pending",
            })

    if not emp.bank_account_number or not emp.bank_ifsc:
        warnings.append({
            "id": f"bank-missing-{emp.id}",
            "title": "Banking Details Notice",
            "message": "Bank account number or IFSC is missing in your employee record. Please contact HR to ensure automated payroll direct credits.",
            "warning_type": "profile_alert",
            "severity": "notice",
            "created_at": emp.created_at,
            "source": "Employee Profile Validation",
            "status": "pending",
        })

    # 4. Shifts / Working Schedule (ONLY this employee)
    schedule_lines = []
    weekly_working_days = 0
    total_weekly_hours = 0.0

    schedule = emp.working_schedule
    if schedule:
        lines_by_day = {line.day_of_week: line for line in schedule.lines}
        for d in range(7):
            line = lines_by_day.get(d)
            if line and line.is_working_day:
                weekly_working_days += 1
                d_hours = 8.0
                if line.start_time and line.end_time:
                    st_mins = line.start_time.hour * 60 + line.start_time.minute
                    et_mins = line.end_time.hour * 60 + line.end_time.minute
                    d_hours = max(0.0, (et_mins - st_mins - (line.break_minutes or 0)) / 60.0)
                total_weekly_hours += d_hours
                schedule_lines.append({
                    "day_of_week": d,
                    "day_name": day_names[d],
                    "is_working_day": True,
                    "start_time": line.start_time.strftime("%H:%M:%S") if line.start_time else "09:00:00",
                    "end_time": line.end_time.strftime("%H:%M:%S") if line.end_time else "18:00:00",
                    "break_minutes": line.break_minutes or 0,
                    "daily_hours": round(d_hours, 2),
                })
            else:
                schedule_lines.append({
                    "day_of_week": d,
                    "day_name": day_names[d],
                    "is_working_day": False,
                    "start_time": None,
                    "end_time": None,
                    "break_minutes": 0,
                    "daily_hours": 0.0,
                })
        sched_name = schedule.name
        sched_id = schedule.id
    else:
        sched_id = None
        sched_name = "Standard 40h (Mon-Fri 09:00-18:00)"
        weekly_working_days = 5
        total_weekly_hours = 40.0
        for d in range(7):
            is_work = d < 5
            schedule_lines.append({
                "day_of_week": d,
                "day_name": day_names[d],
                "is_working_day": is_work,
                "start_time": "09:00:00" if is_work else None,
                "end_time": "18:00:00" if is_work else None,
                "break_minutes": 60 if is_work else 0,
                "daily_hours": 8.0 if is_work else 0.0,
            })

    # 5. Net Salary (ONLY this employee)
    monthly_trend = []
    latest_payslip_lines = []
    latest_net = 0.0
    latest_gross = 0.0
    latest_deductions = 0.0
    paid_slips = [p for p in emp_payslips if p.status == "paid"]
    total_payouts_count = len(paid_slips)
    avg_net = (
        round(sum(float(p.net_salary) for p in paid_slips) / len(paid_slips), 2)
        if paid_slips
        else (float(emp_payslips[0].net_salary) if emp_payslips else 0.0)
    )

    if emp_payslips:
        latest_ps = emp_payslips[0]
        latest_net = float(latest_ps.net_salary)
        latest_gross = float(latest_ps.gross_salary)
        latest_deductions = round(float(latest_ps.gross_salary - latest_ps.net_salary), 2)
        latest_payslip_lines = [
            {
                "name": line.name,
                "code": line.code,
                "category": line.category,
                "amount": float(line.amount),
            }
            for line in latest_ps.lines
        ]

        for ps in emp_payslips[:6]:
            monthly_trend.append({
                "id": ps.id,
                "payrun_id": ps.payrun_id,
                "period_start": ps.period_start,
                "period_end": ps.period_end,
                "gross_salary": float(ps.gross_salary),
                "deductions": round(float(ps.gross_salary - ps.net_salary), 2),
                "net_salary": float(ps.net_salary),
                "status": ps.status,
                "worked_days": float(ps.worked_days),
                "expected_working_days": ps.expected_working_days,
            })

    masked_acc = (
        f"••••{emp.bank_account_number[-4:]}"
        if emp.bank_account_number and len(emp.bank_account_number) >= 4
        else (emp.bank_account_number or "Not Provided")
    )

    return {
        "employee": {
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "department": emp.department,
            "job_position": emp.job_position,
            "employment_status": emp.employment_status,
        },
        "attendance_health": {
            "attendance_health_percentage": health_pct,
            "total_records": total_att,
            "present_days": present_count,
            "late_days": late_count,
            "absent_or_other_days": absent_or_other,
            "total_hours_worked": round(total_hours, 2),
        },
        "recent_attendance": recent_attendance,
        "approved_leaves": approved_leaves,
        "leave_allocations": leave_allocations,
        "total_approved_leave_days": total_approved_leave_days,
        "warnings": warnings,
        "schedule": {
            "schedule_id": sched_id,
            "schedule_name": sched_name,
            "weekly_working_days": weekly_working_days,
            "total_weekly_hours": round(total_weekly_hours, 2),
            "lines": schedule_lines,
        },
        "salary": {
            "latest_net_salary": latest_net,
            "latest_gross_salary": latest_gross,
            "latest_deductions": latest_deductions,
            "average_net_salary": avg_net,
            "total_payouts_count": total_payouts_count,
            "currency": "INR",
            "bank_name": emp.bank_name,
            "bank_account_masked": masked_acc,
            "bank_ifsc": emp.bank_ifsc,
            "monthly_trend": monthly_trend,
            "latest_payslip_lines": latest_payslip_lines,
        },
    }

