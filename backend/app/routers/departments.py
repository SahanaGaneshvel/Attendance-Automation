from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.db import get_db
from app.models import Department, Section, User
from app.services.metrics import (
    department_avg,
    daily_section_pct,
    get_section_attendance,
    section_trend,
    department_trend,
)
from app.services.auth import get_current_user
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


@router.get("/my-department/dashboard")
def get_hod_dashboard(
    date_: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive dashboard data for HOD's department.
    Requires HOD role with scope_department_id set.
    """
    if not current_user.scope_department_id:
        raise HTTPException(status_code=400, detail="No department assigned to this user")

    dept = db.get(Department, current_user.scope_department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Department stats
    dept_stats = department_avg(db, dept.id, date_)

    # Get all sections in department with today's attendance
    sections = db.query(Section).filter_by(department_id=dept.id).order_by(Section.name).all()

    sections_data = []
    for section in sections:
        att = get_section_attendance(db, section.id, date_)

        # Get 10-day trend for sparkline
        from_date = date_ - timedelta(days=10)
        trend = section_trend(db, section.id, from_date, date_)
        trend_values = [
            t["percentage"] for t in trend
            if t["status"] == "recorded" and t["percentage"] is not None
        ]

        sections_data.append({
            "section_id": section.id,
            "section_name": f"{section.stream} Year {section.year} {section.name}",
            "strength": section.strength,
            "status": att["status"],
            "percentage": att["percentage"],
            "present": att["present"],
            "absent": att["absent"],
            "trend": trend_values[-10:] if trend_values else [],  # Last 10 recorded days
        })

    # Get all departments for peer comparison
    all_depts = db.query(Department).all()
    peer_comparison = []
    for d in all_depts:
        d_stats = department_avg(db, d.id, date_)
        peer_comparison.append({
            "department_id": d.id,
            "department_name": d.name,
            "department_code": d.code,
            "percentage": d_stats["percentage"],
            "is_mine": d.id == dept.id,
        })

    # Sort by percentage descending, handling None values
    peer_comparison.sort(key=lambda x: x["percentage"] if x["percentage"] is not None else -1, reverse=True)

    # Add rank
    for i, p in enumerate(peer_comparison):
        p["rank"] = i + 1

    # Find my rank
    my_rank = next((p["rank"] for p in peer_comparison if p["is_mine"]), 0)

    # Get 20-day department trend
    from_date = date_ - timedelta(days=20)
    dept_trend_data = department_trend(db, dept.id, from_date, date_)

    # Count statistics
    recorded_sections = [s for s in sections_data if s["status"] == "recorded"]
    pending_sections = [s for s in sections_data if s["status"] == "pending"]
    below_threshold = [s for s in recorded_sections if s["percentage"] is not None and s["percentage"] < 75]

    return {
        "department_id": dept.id,
        "department_name": dept.name,
        "department_code": dept.code,
        "date": date_.isoformat(),
        "stats": {
            "percentage": dept_stats["percentage"],
            "total_present": dept_stats["total_present"],
            "total_strength": dept_stats["total_strength"],
            "recorded_count": dept_stats["recorded_count"],
            "pending_count": dept_stats["pending_count"],
            "no_session_count": dept_stats["no_session_count"],
            "below_threshold_count": len(below_threshold),
            "my_rank": my_rank,
            "total_departments": len(all_depts),
        },
        "sections": sections_data,
        "peer_comparison": peer_comparison,
        "trend": dept_trend_data,
    }