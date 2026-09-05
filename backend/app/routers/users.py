from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.dependencies import require_admin, get_current_user
from app.models.user import User
from app.models.employee import Employee
from app.schemas.user import UserCreateAdmin, UserUpdateAdmin, UserDetailOut
from app.core.security import hash_password

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _build_user_detail(db: Session, user: User) -> UserDetailOut:
    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    return UserDetailOut(
        id=user.id,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        employee_id=employee.id if employee else None,
        employee_name=employee.name if employee else None,
        employee_email=employee.email if employee else None,
        department=employee.department if employee else None,
    )


@router.get("", response_model=list[UserDetailOut], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.username).all()
    return [_build_user_detail(db, u) for u in users]


@router.get("/{user_id}", response_model=UserDetailOut, dependencies=[Depends(require_admin)])
def get_user(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _build_user_detail(db, user)


@router.post("", response_model=UserDetailOut, status_code=201, dependencies=[Depends(require_admin)])
def create_user(data: UserCreateAdmin, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    employee = None
    if data.employee_id is not None:
        employee = db.query(Employee).filter(Employee.id == data.employee_id).first()
        if not employee:
            raise HTTPException(status_code=400, detail="Referenced employee not found")
        if employee.user_id is not None:
            raise HTTPException(status_code=400, detail="This employee is already linked to a user account")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role.value,
        is_active=data.is_active,
    )
    db.add(user)
    db.flush()

    if employee is not None:
        employee.user_id = user.id

    db.commit()
    db.refresh(user)
    return _build_user_detail(db, user)


@router.put("/{user_id}", response_model=UserDetailOut, dependencies=[Depends(require_admin)])
def update_user(user_id: UUID, data: UserUpdateAdmin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.role is not None:
        user.role = data.role.value
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password:
        user.password_hash = hash_password(data.password)

    if data.employee_id is not None:
        curr_emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        if curr_emp and curr_emp.id != data.employee_id:
            curr_emp.user_id = None

        if data.employee_id:
            new_emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
            if not new_emp:
                raise HTTPException(status_code=400, detail="Referenced employee not found")
            if new_emp.user_id and new_emp.user_id != user.id:
                raise HTTPException(status_code=400, detail="This employee is already linked to another user account")
            new_emp.user_id = user.id

    db.commit()
    db.refresh(user)
    return _build_user_detail(db, user)


@router.delete("/{user_id}", status_code=200)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_admin.id == user.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete their own account")

    linked_emp = db.query(Employee).filter(Employee.user_id == user.id).first()
    if linked_emp:
        linked_emp.user_id = None

    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}
