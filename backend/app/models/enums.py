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
employment_status_enum = ENUM(
    "active", "inactive", "on_leave",
    name="employment_status_type", create_type=False,
)
contract_status_enum = ENUM(
    "draft", "active", "expired", "cancelled",
    name="contract_status_enum", create_type=False,
)
attendance_status_enum = ENUM(
    "present", "late", "absent", "overtime",
    name="attendance_status_enum", create_type=False,
)
time_off_unit_enum = ENUM(
    "days", "hours",
    name="time_off_unit_enum", create_type=False,
)
allocation_status_enum = ENUM(
    "draft", "confirmed", "approved", "refused",
    name="allocation_status_enum", create_type=False,
)
time_off_request_status_enum = ENUM(
    "draft", "confirmed", "approved", "refused",
    name="time_off_request_status_enum", create_type=False,
)
salary_rule_category_enum = ENUM(
    "basic", "allowance", "gross", "deduction", "net",
    name="salary_rule_category_enum", create_type=False,
)
computation_type_enum = ENUM(
    "fixed", "percentage", "formula",
    name="computation_type_enum", create_type=False,
)
payrun_status_enum = ENUM(
    "draft", "computed", "validated", "paid",
    name="payrun_status_enum", create_type=False,
)
payslip_status_enum = ENUM(
    "draft", "computed", "validated", "paid",
    name="payslip_status_enum", create_type=False,
)
