from pydantic import BaseModel
from typing import Optional


class TrendPoint(BaseModel):
    date: str
    pct: float


class SectionDetailResponse(BaseModel):
    section_id: int
    name: str
    department: Optional[str]
    year: str
    semester: int
    today_pct: float
    trend: list[TrendPoint]