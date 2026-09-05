from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    try:
        user_id = UUID(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def current_employee_id(user: User) -> UUID | None:
    """employees.user_id -> users.id (one user -> one employee, per
    docs/architecture.md), so a user's linked employee id is reached via
    the `employee` relationship rather than a column on User itself."""
    return user.employee.id if user.employee else None

def require_roles(*roles: str):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return checker

HR_MANAGER_ROLES = ("hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin")

# Role hierarchy shortcuts
require_hr_manager        = require_roles(*HR_MANAGER_ROLES)
require_hr_payroll_user   = require_roles("hr_payroll_user", "hr_payroll_manager", "admin")
require_hr_payroll_manager= require_roles("hr_payroll_manager", "admin")
require_admin             = require_roles("admin")

def is_hr_manager_or_above(current_user: User) -> bool:
    return current_user.role in HR_MANAGER_ROLES

def is_hr_payroll_user_or_above(current_user: User) -> bool:
    return current_user.role in ("hr_payroll_user", "hr_payroll_manager", "admin")

# For routes documented as "HR Manager+ / own" in spec.md: HR Manager and
# above may access any employee_id; a plain Employee may only access the
# record linked to their own user account.
def require_hr_manager_or_self(employee_id: UUID, current_user: User = Depends(get_current_user)) -> User:
    if is_hr_manager_or_above(current_user) or current_employee_id(current_user) == employee_id:
        return current_user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
