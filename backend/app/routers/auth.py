from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import TokenOut, UserCreate, UserOut
from app.core.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(response: Response, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token({"sub": str(user.id), "role": user.role.name})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role.name})
    response.set_cookie("refresh_token", refresh_token, httponly=True, max_age=7*24*3600)
    return {"access_token": access_token}

@router.post("/refresh", response_model=TokenOut)
def refresh(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    payload = decode_token(token)
    return {"access_token": create_access_token({"sub": payload["sub"], "role": payload["role"]})}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"detail": "Logged out"}

@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    role = db.query(Role).filter(Role.name == data.role.value).first()
    if not role:
        raise HTTPException(status_code=400, detail=f"Role '{data.role.value}' is not seeded yet")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role_id=role.id,
        employee_id=data.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, username=user.username, role=role.name, is_active=user.is_active)
