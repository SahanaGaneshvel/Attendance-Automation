"""
Calendar router - provides working days and holiday information.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.db import get_db
from app.models import CalendarDay
from app.schemas.stats import WorkingDaysResponse, WorkingDay

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/working-days", response_model=WorkingDaysResponse)
def get_working_days(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    """
    Get all working days in a date range.
    If calendar entries don't exist, generates them on-the-fly (excludes Sundays).
    """
    days = []
    current = from_date

    while current <= to_date:
        # Try to get from database
        calendar_entry = db.query(CalendarDay).filter_by(date=current).first()

        if calendar_entry:
            if calendar_entry.is_working_day:
                days.append(WorkingDay(
                    date=current.isoformat(),
                    is_holiday=calendar_entry.is_holiday,
                    holiday_name=calendar_entry.holiday_name,
                ))
        else:
            # Default: all days except Sunday are working days
            if current.weekday() != 6:  # 6 = Sunday
                days.append(WorkingDay(
                    date=current.isoformat(),
                    is_holiday=False,
                    holiday_name=None,
                ))

        current += timedelta(days=1)

    return WorkingDaysResponse(
        from_date=from_date.isoformat(),
        to_date=to_date.isoformat(),
        days=days,
        total_working_days=len(days),
    )


@router.get("/today")
def get_today():
    """Returns today's date in ISO format."""
    return {"today": date.today().isoformat()}


@router.post("/seed-default")
def seed_default_calendar(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    """
    Seeds the calendar with default working days (excludes Sundays).
    Useful for initial setup.
    """
    current = from_date
    created = 0

    while current <= to_date:
        existing = db.query(CalendarDay).filter_by(date=current).first()
        if not existing:
            is_sunday = current.weekday() == 6
            db.add(CalendarDay(
                date=current,
                is_working_day=not is_sunday,
                is_holiday=False,
                holiday_name=None,
            ))
            created += 1
        current += timedelta(days=1)

    db.commit()
    return {"created": created, "from": from_date.isoformat(), "to": to_date.isoformat()}
