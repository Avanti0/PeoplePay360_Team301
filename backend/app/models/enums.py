"""Postgres ENUM types, mirroring the types created in database/schema.sql.

create_type=False on every one: schema.sql owns DDL (CREATE TYPE / CREATE
TABLE), these just describe the existing types so SQLAlchemy never tries
to create or alter them itself.
"""
from sqlalchemy.dialects.postgresql import ENUM

role_name_enum = ENUM(
    "employee", "hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin",
    name="role_name", create_type=False,
)
gender_type_enum = ENUM(
    "male", "female", "other",
    name="gender_type", create_type=False,
)
employment_status_enum = ENUM(
    "active", "inactive", "terminated",
    name="employment_status_type", create_type=False,
)
schedule_type_enum = ENUM(
    "full_time", "part_time", "shift",
    name="schedule_type_enum", create_type=False,
)
employment_type_enum = ENUM(
    "permanent", "contract", "intern",
    name="employment_type_enum", create_type=False,
)
contract_status_enum = ENUM(
    "draft", "running", "expired", "cancelled",
    name="contract_status_enum", create_type=False,
)
attendance_status_enum = ENUM(
    "present", "late", "absent", "half_day", "on_leave",
    name="attendance_status_enum", create_type=False,
)
time_off_unit_enum = ENUM(
    "days", "hours",
    name="time_off_unit_enum", create_type=False,
)
allocation_status_enum = ENUM(
    "draft", "approved", "refused",
    name="allocation_status_enum", create_type=False,
)
time_off_request_status_enum = ENUM(
    "draft", "submitted", "approved", "refused", "cancelled",
    name="time_off_request_status_enum", create_type=False,
)
salary_rule_category_enum = ENUM(
    "basic", "allowance", "gross", "deduction", "net", "other",
    name="salary_rule_category_enum", create_type=False,
)
computation_method_enum = ENUM(
    "fixed", "percentage", "formula",
    name="computation_method_enum", create_type=False,
)
payrun_status_enum = ENUM(
    "draft", "computed", "validated", "paid",
    name="payrun_status_enum", create_type=False,
)
payslip_status_enum = ENUM(
    "draft", "computed", "validated", "paid",
    name="payslip_status_enum", create_type=False,
)
warning_type_enum = ENUM(
    "missing_bank_details", "missing_employee_info", "duplicate_payslip",
    "contract_conflict", "missing_contract", "invalid_payroll_context",
    "missing_salary_configuration",
    name="warning_type_enum", create_type=False,
)
