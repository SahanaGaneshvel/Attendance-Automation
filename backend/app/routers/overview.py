"""
Overview router - college-wide dashboard data.
CRITICAL: Properly handles recorded/no_session/pending states.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date

from app.db import get_db
from app.models import Department, Section, School
from app.services.metrics import (
    college_avg,
    department_avg,
    classes_above_below,
    get_section_attendance,
)
from app.schemas.overview import OverviewResponse

router = APIRouter(tags=["overview"])


@router.get("/overview", response_model=OverviewResponse)
def get_overview(
    target_date: date = Query(..., alias="date"),
    threshold: float = Query(75),
    db: Session = Depends(get_db),
):
    """
    Get college-wide overview for a given date.

    CRITICAL: Only RECORDED sections count toward averages.
    Pending and no_session are reported separately.
    """
    # College-wide stats (weighted, excludes pending/no_session)
    college_stats = college_avg(db, target_date)
    counts = classes_above_below(db, target_date, threshold)

    heatmap = []
    departments = db.query(Department).all()

    for dept in departments:
        # Get department stats (weighted)
        dept_stats = department_avg(db, dept.id, target_date)

        sections = db.query(Section).filter_by(department_id=dept.id).all()
        sections_data = []

        for section in sections:
            att = get_section_attendance(db, section.id, target_date)

            sections_data.append({
                "section_id": str(section.id),
                "name": section.name,
                "year": section.year,
                "semester": section.semester,
                "stream": section.stream,
                "strength": att["strength"],
                "status": att["status"],
                # percentage is None for pending/no_session - frontend renders grey
                "percentage": att["percentage"],
                "above": att["percentage"] >= threshold if att["percentage"] is not None else None,
            })

        heatmap.append({
            "department": dept.name,
            "department_id": str(dept.id),
            "department_code": dept.code,
            "sections": sections_data,
            # Weighted average (None if no recorded sections)
            "average_percentage": dept_stats["percentage"],
            "above": dept_stats["percentage"] >= threshold if dept_stats["percentage"] is not None else None,
            "recorded_count": dept_stats["recorded_count"],
            "pending_count": dept_stats["pending_count"],
            "no_session_count": dept_stats["no_session_count"],
        })

    return {
        "date": target_date.isoformat(),
        "threshold": threshold,
        "kpis": {
            "overall_percentage": college_stats["percentage"] if college_stats["percentage"] is not None else 0.0,
            "total_present": college_stats["total_present"],
            "total_strength": college_stats["total_strength"],
            "classes_above": counts["above"],
            "classes_below": counts["below"],
            "classes_pending": counts["pending"],
            "classes_no_session": counts["no_session"],
        },
        "heatmap": heatmap,
    }
