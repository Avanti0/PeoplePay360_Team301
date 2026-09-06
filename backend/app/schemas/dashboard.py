from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class AttendanceHealthSummary(BaseModel):
    attendance_health_percentage: float
    total_records: int
    present_days: int
    late_days: int
    absent_or_other_days: int
    total_hours_worked: float


class EmployeeAttendanceItem(BaseModel):
    id: UUID
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    worked_hours: Optional[float] = None
    status: str
    is_manual: bool
    note: Optional[str] = None
    expected_working_day: Optional[bool] = None


class LeaveAllocationSummary(BaseModel):
    id: UUID
    time_off_type_name: str
    unit: str
    allocated_days: float
    taken_days: float
    remaining_days: float


class EmployeeApprovedLeaveItem(BaseModel):
    id: UUID
    time_off_type_name: str
    date_from: date
    date_to: date
    duration: float
    status: str
    reason: Optional[str] = None


class EmployeeWarningItem(BaseModel):
    id: str
    title: str
    message: str
    warning_type: str
    severity: str  # "warning" | "notice" | "critical"
    created_at: Optional[datetime] = None
    source: str
    status: str  # "pending" | "resolved"


class ScheduleLineItem(BaseModel):
    day_of_week: int  # 0..6
    day_name: str     # Monday, Tuesday, ...
    is_working_day: bool
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    break_minutes: int = 0
    daily_hours: float = 0.0


class EmployeeScheduleSummary(BaseModel):
    schedule_id: Optional[UUID] = None
    schedule_name: str
    weekly_working_days: int
    total_weekly_hours: float
    lines: List[ScheduleLineItem]


class EmployeePayslipSummaryItem(BaseModel):
    id: UUID
    payrun_id: UUID
    period_start: date
    period_end: date
    gross_salary: float
    deductions: float
    net_salary: float
    status: str
    worked_days: float
    expected_working_days: Optional[int] = None


class EmployeePayslipLineItem(BaseModel):
    name: str
    code: str
    category: str
    amount: float


class EmployeeSalarySummary(BaseModel):
    latest_net_salary: float
    latest_gross_salary: float
    latest_deductions: float
    average_net_salary: float
    total_payouts_count: int
    currency: str = "INR"
    bank_name: Optional[str] = None
    bank_account_masked: Optional[str] = None
    bank_ifsc: Optional[str] = None
    monthly_trend: List[EmployeePayslipSummaryItem]
    latest_payslip_lines: List[EmployeePayslipLineItem]


class EmployeeProfileBrief(BaseModel):
    id: UUID
    name: str
    email: str
    department: Optional[str] = None
    job_position: Optional[str] = None
    employment_status: str


class EmployeeDashboardOut(BaseModel):
    employee: Optional[EmployeeProfileBrief] = None
    attendance_health: AttendanceHealthSummary
    recent_attendance: List[EmployeeAttendanceItem]
    approved_leaves: List[EmployeeApprovedLeaveItem]
    leave_allocations: List[LeaveAllocationSummary]
    total_approved_leave_days: float
    warnings: List[EmployeeWarningItem]
    schedule: EmployeeScheduleSummary
    salary: EmployeeSalarySummary
