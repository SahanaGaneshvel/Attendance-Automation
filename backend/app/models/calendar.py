"""
Calendar model for tracking working days, holidays, and no-session days.
Production-grade: supports institution-wide and department-level overrides.
"""
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base


class CalendarDay(Base):
    """
    Represents a single day in the academic calendar.
    is_working_day = False for holidays/weekends.
    """
    __tablename__ = "calendar_days"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    is_working_day = Column(Boolean, nullable=False, default=True)
    is_holiday = Column(Boolean, nullable=False, default=False)
    holiday_name = Column(String, nullable=True)

    # For bulk generation tracking
    academic_year = Column(String, nullable=True)  # e.g., "2025-26"


class DepartmentCalendarOverride(Base):
    """
    Department-level overrides for specific days.
    E.g., a department might have no classes on a normally working day.
    """
    __tablename__ = "department_calendar_overrides"

    id = Column(Integer, primary_key=True, index=True)
    calendar_day_id = Column(Integer, ForeignKey("calendar_days.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    is_working_day = Column(Boolean, nullable=False)
    reason = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("calendar_day_id", "department_id", name="uq_calendar_dept_override"),
    )

    calendar_day = relationship("CalendarDay")
    department = relationship("Department")


class SectionNoSession(Base):
    """
    Tracks days when a specific section has no first-hour session.
    This is distinct from holidays - the section exists but had no class.
    """
    __tablename__ = "section_no_sessions"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    date = Column(Date, nullable=False)
    reason = Column(String, nullable=True)  # e.g., "Faculty leave", "Lab session"

    __table_args__ = (
        UniqueConstraint("section_id", "date", name="uq_section_no_session"),
    )

    section = relationship("Section")
