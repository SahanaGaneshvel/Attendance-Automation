"""
Department model - belongs to a School, contains Sections (classes).
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)

    # Materialized path for efficient subtree queries
    # Format: "/institution_id/school_id/department_id"
    path = Column(String, nullable=False, default="/1/1")

    school = relationship("School", back_populates="departments")
    sections = relationship("Section", back_populates="department")
