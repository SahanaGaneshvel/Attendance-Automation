from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.db import get_db
from app.models import Section, Department
from app.services.metrics import daily_section_pct, section_trend
from app.schemas.section import SectionDetailResponse

router = APIRouter(prefix="/sections", tags=["sections"])


@router.get("/{id}/detail", response_model=SectionDetailResponse)
def section_detail(
    id: int,
    date: date = Query(...),
    db: Session = Depends(get_db),
):
    section = db.get(Section, id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    dept = db.get(Department, section.department_id)

    today_pct = daily_section_pct(db, id, date)
    today_pct = today_pct if today_pct is not None else 0.0

    from_date = date - timedelta(days=20)
    trend = section_trend(db, id, from_date, date)

    return {
        "section_id": section.id,
        "name": section.name,
        "department": dept.name if dept else None,
        "year": section.year,
        "semester": section.semester,
        "today_pct": today_pct,
        "trend": trend,
    }