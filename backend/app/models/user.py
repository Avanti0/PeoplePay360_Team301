from sqlalchemy import Column, BigInteger, Text, Boolean, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(BigInteger, primary_key=True)
    username      = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    role_id       = Column(BigInteger, ForeignKey("roles.id"), nullable=False)
    employee_id   = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"), unique=True)
    is_active     = Column(Boolean, nullable=False, server_default="true")
    last_login_at = Column(TIMESTAMP(timezone=True))
    created_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    role     = relationship("Role", back_populates="users")
    employee = relationship("Employee", back_populates="user")
