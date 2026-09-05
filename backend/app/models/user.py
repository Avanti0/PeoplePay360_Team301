import uuid
from sqlalchemy import Column, String, Boolean, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email    = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role     = Column(SAEnum("employee", "hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin", name="user_role"), nullable=False)
    is_active= Column(Boolean, default=True)
