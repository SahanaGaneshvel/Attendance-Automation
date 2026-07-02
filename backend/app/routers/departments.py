from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.db import get_db
from app.models import Department, Section
from app.services.metrics import department_avg, daily_section_pct
from app.schemas.department import DepartmentSummaryResponse

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("/{id}/summary", response_model=DepartmentSummaryResponse)
def department_summary(
    id: int,
    date: date = Query(...),
    threshold: float = Query(75),
    db: Session = Depends(get_db),
):
    dept = db.get(Department, id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    avg_pct = department_avg(db, id, date)
    avg_pct = avg_pct if avg_pct is not None else 0.0

    sections = db.query(Section).filter_by(department_id=id).all()

    sections_data = []
    for section in sections:
        pct = daily_section_pct(db, section.id, date)
        pct = pct if pct is not None else 0.0
        sections_data.append({
            "section_id": section.id,
            "name": section.name,
            "pct": pct,
            "above": pct >= threshold,
        })

    sections_data.sort(key=lambda s: s["pct"], reverse=True)

    return {
        "dept_id": dept.id,
        "department": dept.name,
        "avg_pct": avg_pct,
        "above_threshold": avg_pct >= threshold,
        "sections": sections_data,
    }