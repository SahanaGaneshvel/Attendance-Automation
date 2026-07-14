"""
Overview schemas - college-wide dashboard data.
Properly supports the three day states: recorded/no_session/pending.
"""
from pydantic import BaseModel
from typing import Optional


class SectionHeat(BaseModel):
    """Section data for heatmap cell."""
    section_id: str
    name: str
    year: int
    semester: int
    stream: Optional[str]
    strength: int
    status: str  # 'recorded' | 'no_session' | 'pending'
    percentage: Optional[float]  # None for pending/no_session
    above: Optional[bool]  # None for pending/no_session


class DepartmentHeat(BaseModel):
    """Department row in heatmap."""
    department: str
    department_id: str
    department_code: str
    sections: list[SectionHeat]
    average_percentage: Optional[float]  # Weighted, None if no recorded sections
    above: Optional[bool]
    recorded_count: int
    pending_count: int
    no_session_count: int


class KPIs(BaseModel):
    """College-wide KPIs."""
    overall_percentage: float
    total_present: int
    total_strength: int
    classes_above: int
    classes_below: int
    classes_pending: int
    classes_no_session: int


class OverviewResponse(BaseModel):
    """Full overview response."""
    date: str
    threshold: float
    kpis: KPIs
    heatmap: list[DepartmentHeat]
