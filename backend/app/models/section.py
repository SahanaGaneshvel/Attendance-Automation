from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    name = Column(String, nullable=False)          # e.g. 'AIDS A', 'CYBER'
    year = Column(String, nullable=False)           # 'II', 'III', 'IV'
    semester = Column(Integer, nullable=False)       # 3, 5, 7
    strength = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("department_id", "name", "year", "semester", name="uq_dept_section_year_sem"),
    )

    department = relationship("Department")