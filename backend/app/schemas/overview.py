from pydantic import BaseModel


class SectionHeat(BaseModel):
    name: str
    year: str
    semester: int
    pct: float
    above: bool


class DepartmentHeat(BaseModel):
    department: str
    dept_id: int
    sections: list[SectionHeat]
    avg: float
    above: bool


class KPIs(BaseModel):
    overall_pct: float
    classes_above: int
    classes_below: int


class OverviewResponse(BaseModel):
    date: str
    threshold: float
    kpis: KPIs
    heatmap: list[DepartmentHeat]