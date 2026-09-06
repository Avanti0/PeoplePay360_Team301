from app.core.dependencies import require_roles, require_admin, require_hr_manager, require_hr_payroll_user, require_hr_payroll_manager
from app.models.user import User
from fastapi import HTTPException
import pytest


def test_rbac_role_hierarchy():
    """Rule 14: Strict RBAC authorization enforcement."""
    admin_user = User(username="admin", role="admin")
    hr_mgr_user = User(username="emp-001", role="hr_manager")
    payroll_mgr_user = User(username="emp-004", role="hr_payroll_manager")
    payroll_user = User(username="emp-005", role="hr_payroll_user")
    employee_user = User(username="emp-002", role="employee")

    admin_checker = require_roles("admin")
    hr_checker = require_roles("hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin")
    payroll_user_checker = require_roles("hr_payroll_user", "hr_payroll_manager", "admin")
    payroll_mgr_checker = require_roles("hr_payroll_manager", "admin")

    # Admin passes all
    assert admin_checker(admin_user) == admin_user
    assert hr_checker(admin_user) == admin_user
    assert payroll_user_checker(admin_user) == admin_user
    assert payroll_mgr_checker(admin_user) == admin_user

    # HR Manager passes HR check but fails Payroll Manager and Admin check
    assert hr_checker(hr_mgr_user) == hr_mgr_user
    with pytest.raises(HTTPException):
        admin_checker(hr_mgr_user)
    with pytest.raises(HTTPException):
        payroll_mgr_checker(hr_mgr_user)

    # Payroll User passes Payroll User check but fails Admin check
    assert payroll_user_checker(payroll_user) == payroll_user
    with pytest.raises(HTTPException):
        admin_checker(payroll_user)

    # Payroll Manager passes Payroll Manager check but fails Admin check
    assert payroll_mgr_checker(payroll_mgr_user) == payroll_mgr_user
    with pytest.raises(HTTPException):
        admin_checker(payroll_mgr_user)

    # Regular Employee fails administrative checks
    with pytest.raises(HTTPException):
        hr_checker(employee_user)
    with pytest.raises(HTTPException):
        payroll_user_checker(employee_user)
    with pytest.raises(HTTPException):
        admin_checker(employee_user)
