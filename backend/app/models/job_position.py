from sqlalchemy import Column, BigInteger, Text, TIMESTAMP, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class JobPosition(Base):
    __tablename__ = "job_positions"
    __table_args__ = (UniqueConstraint("title", "department_id"),)

    id            = Column(BigInteger, primary_key=True)
    title         = Column(Text, nullable=False)
    department_id = Column(BigInteger, ForeignKey("departments.id", ondelete="SET NULL"))
    created_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    department = relationship("Department", back_populates="job_positions")
    employees  = relationship("Employee", back_populates="job_position")
    contracts  = relationship("Contract", back_populates="job_position")
