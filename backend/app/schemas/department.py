from pydantic import BaseModel


class SectionSummary(BaseModel):
    section_id: int
    name: str
    pct: float
    above: bool


class DepartmentSummaryResponse(BaseModel):
    dept_id: int
    department: str
    avg_pct: float
    above_threshold: bool
    sections: list[SectionSummary]