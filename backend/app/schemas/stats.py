"""
Statistics schemas for frontend consumption.
All IDs are strings to match frontend expectations.
"""
from pydantic import BaseModel, field_validator
from typing import Optional
from enum import Enum


class SessionStatus(str, Enum):
    """Day state for a section - critical for correct averages."""
    RECORDED = "recorded"      # Attendance was taken
    NO_SESSION = "no_session"  # No class scheduled (excluded from averages)
    PENDING = "pending"        # Working day but not yet recorded


class TrendPoint(BaseModel):
    """Single point in a trend chart."""
    date: str
    percentage: float
    status: SessionStatus = SessionStatus.RECORDED


class SectionAttendance(BaseModel):
    """Daily attendance for a single section."""
    id: str
    name: str
    department_id: str
    department_code: str
    year: str
    semester: int
    strength: int
    present: int
    absent: int
    percentage: float
    status: SessionStatus

    @field_validator('id', 'department_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v)


class DepartmentStats(BaseModel):
    """Aggregated stats for a department."""
    id: str
    name: str
    code: str
    average_percentage: float
    total_present: int
    total_strength: int
    sections_below_threshold: int
    sections_total: int
    sections_recorded: int
    sections_pending: int
    sections_no_session: int

    @field_validator('id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v)


class CollegeStatsResponse(BaseModel):
    """Institution-wide stats for a given date."""
    date: str
    overall_percentage: float
    total_present: int
    total_strength: int
    total_classes: int
    classes_below_threshold: int
    classes_recorded: int
    classes_pending: int
    classes_no_session: int
    department_stats: list[DepartmentStats]


class ChronicOffender(BaseModel):
    """A section that's been below threshold for multiple consecutive days."""
    section_id: str
    section_name: str
    department_id: str
    department_code: str
    department_name: str
    consecutive_days_below: int
    current_percentage: float
    year: str
    semester: int

    @field_validator('section_id', 'department_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v)


class ChronicOffendersResponse(BaseModel):
    """List of chronic offenders."""
    threshold: float
    min_consecutive_days: int
    offenders: list[ChronicOffender]


class BiggestDrop(BaseModel):
    """Section with the biggest day-over-day decline."""
    section_id: str
    section_name: str
    department_id: str
    department_code: str
    department_name: str
    drop_percentage: float
    current_percentage: float
    previous_percentage: float
    year: str
    semester: int

    @field_validator('section_id', 'department_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v)


class BiggestDropResponse(BaseModel):
    """Response for biggest drop query."""
    date: str
    previous_date: Optional[str]
    drop: Optional[BiggestDrop]


class BiggestMover(BaseModel):
    """Section with significant week-over-week change."""
    section_id: str
    section_name: str
    department_id: str
    department_code: str
    department_name: str
    current_week_avg: float
    previous_week_avg: float
    delta: float
    year: str
    semester: int

    @field_validator('section_id', 'department_id', mode='before')
    @classmethod
    def convert_id_to_string(cls, v):
        return str(v)


class BiggestMoversResponse(BaseModel):
    """Top risers and fallers."""
    risers: list[BiggestMover]
    fallers: list[BiggestMover]


class WorkingDay(BaseModel):
    """A single working day entry."""
    date: str
    is_holiday: bool = False
    holiday_name: Optional[str] = None


class WorkingDaysResponse(BaseModel):
    """List of working days in a range."""
    from_date: str
    to_date: str
    days: list[WorkingDay]
    total_working_days: int
