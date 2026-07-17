from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional
from pydantic import BaseModel

from app.db import get_db
from app.models import Section, Department, User
from app.services.metrics import (
    daily_section_pct,
    section_trend,
    department_avg,
    get_section_attendance,
)
from app.services.auth import get_current_user
from app.schemas.section import SectionDetailResponse

router = APIRouter(prefix="/sections", tags=["sections"])


class TeacherDashboardResponse(BaseModel):
    """Complete data for teacher dashboard."""
    section_id: int
    section_name: str
    department_id: int
    department_name: str
    strength: int
    today: dict  # {status, percentage, present, absent}
    department_avg: Optional[float]
    trend: list  # 20-day trend with {date, percentage, status}
    quick_stats: dict  # {best, worst, days_below, average}


@router.get("/my-section/dashboard")
def get_my_section_dashboard(
    date_: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get dashboard data for the teacher's assigned section.
    Requires teacher role with scope_section_id set.
    """
    if not current_user.scope_section_id:
        raise HTTPException(status_code=400, detail="No section assigned to this user")

    section = db.get(Section, current_user.scope_section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    dept = db.get(Department, section.department_id)

    # Today's attendance
    today_att = get_section_attendance(db, section.id, date_)

    # Department average for comparison
    dept_stats = department_avg(db, section.department_id, date_)

    # 20-day trend
    from_date = date_ - timedelta(days=20)
    trend_data = section_trend(db, section.id, from_date, date_)

    # Calculate quick stats from trend
    recorded_pcts = [t["percentage"] for t in trend_data if t["status"] == "recorded" and t["percentage"] is not None]
    if recorded_pcts:
        quick_stats = {
            "best": max(recorded_pcts),
            "worst": min(recorded_pcts),
            "days_below_75": sum(1 for p in recorded_pcts if p < 75),
            "average": round(sum(recorded_pcts) / len(recorded_pcts), 1),
            "recorded_days": len(recorded_pcts),
        }
    else:
        quick_stats = {
            "best": 0,
            "worst": 0,
            "days_below_75": 0,
            "average": 0,
            "recorded_days": 0,
        }

    return {
        "section_id": section.id,
        "section_name": f"{section.stream} Year {section.year} {section.name}",
        "department_id": section.department_id,
        "department_name": dept.name if dept else "Unknown",
        "strength": section.strength,
        "today": {
            "status": today_att["status"],
            "percentage": today_att["percentage"],
            "present": today_att["present"],
            "absent": today_att["absent"],
        },
        "department_avg": dept_stats["percentage"],
        "trend": trend_data,
        "quick_stats": quick_stats,
    }


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
