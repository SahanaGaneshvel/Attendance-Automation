"""
Schools router - Dean dashboard and school-level data.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.db import get_db
from app.models import School, Department, Section, User
from app.services.metrics import (
    school_avg,
    department_avg,
    college_trend,
    classes_above_below,
    get_chronic_offenders,
    get_biggest_drop,
    get_section_attendance,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/schools", tags=["schools"])


@router.get("/my-school/dashboard")
def get_dean_dashboard(
    date_: date = Query(..., alias="date"),
    threshold: float = Query(75),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive dashboard data for Dean's school.
    Requires dean role with scope_school_id set.
    """
    if not current_user.scope_school_id:
        raise HTTPException(status_code=400, detail="No school assigned to this user")

    school = db.get(School, current_user.scope_school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # School-wide stats (weighted)
    school_stats = school_avg(db, school.id, date_)

    # Get counts
    counts = classes_above_below(db, date_, threshold, school_id=school.id)

    # Get all departments with stats
    departments = db.query(Department).filter_by(school_id=school.id).order_by(Department.name).all()

    dept_rankings = []
    depts_below_threshold = 0

    for dept in departments:
        dept_stats = department_avg(db, dept.id, date_)
        pct = dept_stats["percentage"]

        if pct is not None and pct < threshold:
            depts_below_threshold += 1

        dept_rankings.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "percentage": pct,
            "recorded_count": dept_stats["recorded_count"],
            "pending_count": dept_stats["pending_count"],
            "no_session_count": dept_stats["no_session_count"],
            "total_present": dept_stats["total_present"],
            "total_strength": dept_stats["total_strength"],
        })

    # Sort by percentage descending (None values at end)
    dept_rankings.sort(key=lambda x: x["percentage"] if x["percentage"] is not None else -1, reverse=True)

    # Add rank
    for i, d in enumerate(dept_rankings):
        d["rank"] = i + 1

    # Chronic offenders (school-wide)
    chronic_offenders = get_chronic_offenders(db, threshold, min_consecutive_days=3)

    # Biggest drop
    biggest_drop = get_biggest_drop(db, date_)

    # 20-day college trend
    from_date = date_ - timedelta(days=20)
    trend_data = college_trend(db, from_date, date_)

    # Heatmap data - all departments and sections
    heatmap = []
    for dept in departments:
        dept_stats = department_avg(db, dept.id, date_)
        sections = db.query(Section).filter_by(department_id=dept.id).order_by(Section.name).all()

        sections_data = []
        for section in sections:
            att = get_section_attendance(db, section.id, date_)
            sections_data.append({
                "section_id": section.id,
                "name": section.name,
                "year": section.year,
                "semester": section.semester,
                "stream": section.stream,
                "strength": section.strength,
                "status": att["status"],
                "percentage": att["percentage"],
                "present": att["present"],
                "absent": att["absent"],
            })

        heatmap.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "percentage": dept_stats["percentage"],
            "sections": sections_data,
        })

    return {
        "school_id": school.id,
        "school_name": school.name,
        "date": date_.isoformat(),
        "threshold": threshold,
        "stats": {
            "percentage": school_stats["percentage"],
            "total_present": school_stats["total_present"],
            "total_strength": school_stats["total_strength"],
            "classes_above": counts["above"],
            "classes_below": counts["below"],
            "classes_pending": counts["pending"],
            "classes_no_session": counts["no_session"],
            "total_classes": counts["above"] + counts["below"] + counts["pending"] + counts["no_session"],
            "departments_below_threshold": depts_below_threshold,
            "total_departments": len(departments),
        },
        "department_rankings": dept_rankings,
        "chronic_offenders": chronic_offenders[:10],  # Top 10
        "biggest_drop": biggest_drop,
        "trend": trend_data,
        "heatmap": heatmap,
    }
