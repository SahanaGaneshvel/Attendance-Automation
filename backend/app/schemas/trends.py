from pydantic import BaseModel
from typing import Optional


class TrendPoint(BaseModel):
    date: str
    pct: float


class TrendResponse(BaseModel):
    scope: str
    id: Optional[int] = None
    from_date: str
    to_date: str
    data: list[TrendPoint]