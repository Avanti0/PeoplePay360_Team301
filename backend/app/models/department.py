from sqlalchemy import Column, BigInteger, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Department(Base):
    __tablename__ = "departments"

    id         = Column(BigInteger, primary_key=True)
    name       = Column(Text, nullable=False, unique=True)
    code       = Column(Text, unique=True)
    manager_id = Column(BigInteger, ForeignKey("employees.id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    manager       = relationship("Employee", foreign_keys=[manager_id])
    employees     = relationship("Employee", back_populates="department", foreign_keys="Employee.department_id")
    job_positions = relationship("JobPosition", back_populates="department")
