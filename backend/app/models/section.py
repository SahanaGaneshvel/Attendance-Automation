"""
Section model - a class within a department.
This is the atomic unit for attendance tracking.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base


class Section(Base):
    """
    A class/section within a department.
    Attendance is tracked at this level (not per-student).
    """
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    name = Column(String, nullable=False)          # e.g. 'A', 'B', 'C'
    year = Column(Integer, nullable=False)          # 2, 3, 4 (integer, not Roman)
    semester = Column(Integer, nullable=False)      # 3, 5, 7
    stream = Column(String, nullable=True)          # e.g. 'AI&DS', 'CSE', null for single-stream
    strength = Column(Integer, nullable=False)      # Master data - current class size

    # Materialized path for efficient subtree queries
    # Format: "/institution_id/school_id/department_id/section_id"
    path = Column(String, nullable=False, default="/1/1/1")

    __table_args__ = (
        UniqueConstraint("department_id", "name", "year", "semester", name="uq_dept_section_year_sem"),
    )

    department = relationship("Department", back_populates="sections")
    attendance_records = relationship("AttendanceRecord", back_populates="section")
