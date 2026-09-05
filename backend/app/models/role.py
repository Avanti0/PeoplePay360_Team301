from sqlalchemy import Column, BigInteger, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.enums import role_name_enum


class Role(Base):
    __tablename__ = "roles"

    id          = Column(BigInteger, primary_key=True)
    name        = Column(role_name_enum, nullable=False, unique=True)
    description = Column(Text)

    employees = relationship("Employee", back_populates="role")
    users     = relationship("User", back_populates="role")
