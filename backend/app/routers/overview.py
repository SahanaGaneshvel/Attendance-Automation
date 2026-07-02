from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db import get_db
from app.models import Department, Section
from app.services.metrics import college_avg, classes_above_below, daily_section_pct
from app.schemas.overview import OverviewResponse

router = APIRouter(tags=["overview"])


@router.get("/overview", response_model=OverviewResponse)
def get_overview(
    date: date = Query(...),
    threshold: float = Query(75),
    db: Session = Depends(get_db),
):
    overall_pct = college_avg(db, date)
    counts = classes_above_below(db, date, threshold)

    heatmap = []
    departments = db.query(Department).all()

    for dept in departments:
        sections = db.query(Section).filter_by(department_id=dept.id).all()

        sections_data = []
        for section in sections:
            pct = daily_section_pct(db, section.id, date)
            pct = pct if pct is not None else 0.0
            sections_data.append({
                "name": section.name,
                "year": section.year,
                "semester": section.semester,
                "pct": pct,
                "above": pct >= threshold,
            })

        dept_avg = (
            sum(s["pct"] for s in sections_data) / len(sections_data)
            if sections_data else 0.0
        )

        heatmap.append({
            "department": dept.name,
            "dept_id": dept.id,
            "sections": sections_data,
            "avg": round(dept_avg, 1),
            "above": dept_avg >= threshold,
        })

    return {
        "date": date.isoformat(),
        "threshold": threshold,
        "kpis": {
            "overall_pct": overall_pct if overall_pct is not None else 0.0,
            "classes_above": counts["above"],
            "classes_below": counts["below"],
        },
        "heatmap": heatmap,
    }