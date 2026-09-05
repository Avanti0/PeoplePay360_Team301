from sqlalchemy import Column, Text, Boolean, TIMESTAMP, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import role_name_enum


class User(Base):
    __tablename__ = "users"

    id            = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    username      = Column(Text, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    role          = Column(role_name_enum, nullable=False)
    is_active     = Column(Boolean, nullable=False, server_default="true")
    last_login_at = Column(TIMESTAMP(timezone=True))
    created_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # The FK lives on employees.user_id (one user -> one employee, per
    # docs/architecture.md) - not on this table.
    employee = relationship("Employee", back_populates="user", uselist=False)
