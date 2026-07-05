"""
Statistics router - provides aggregated data for the dashboard.
Production-grade: handles no_session days, weighted averages, trends.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.db import get_db
from app.models import Department, Section, AttendanceRecord, CalendarDay, SectionNoSession
from app.schemas.stats import (
    CollegeStatsResponse,
    DepartmentStats,
    ChronicOffendersResponse,
    ChronicOffender,
    BiggestDropResponse,
    BiggestDrop,
    BiggestMoversResponse,
    BiggestMover,
    SessionStatus,
)

router = APIRouter(prefix="/stats", tags=["statistics"])


def get_section_status(db: Session, section_id: int, target_date: date) -> SessionStatus:
    """Determine the session status for a section on a given date."""
    # Check if there's a no-session record
    no_session = db.query(SectionNoSession).filter_by(
        section_id=section_id, date=target_date
    ).first()
    if no_session:
        return SessionStatus.NO_SESSION

    # Check if attendance was recorded
    record = db.query(AttendanceRecord).filter_by(
        section_id=section_id, date=target_date
    ).first()
    if record:
        return SessionStatus.RECORDED

    # Check if it's a working day
    calendar = db.query(CalendarDay).filter_by(date=target_date).first()
    if calendar and not calendar.is_working_day:
        return SessionStatus.NO_SESSION

    # It's a working day with no record - pending
    return SessionStatus.PENDING


def get_section_attendance(db: Session, section: Section, target_date: date) -> dict:
    """Get attendance data for a section, respecting session status."""
    status = get_section_status(db, section.id, target_date)

    if status == SessionStatus.NO_SESSION:
        return {
            "present": 0,
            "absent": 0,
            "percentage": 0.0,
            "status": status,
        }

    record = db.query(AttendanceRecord).filter_by(
        section_id=section.id, date=target_date
    ).first()

    if not record:
        return {
            "present": 0,
            "absent": 0,
            "percentage": 0.0,
            "status": SessionStatus.PENDING,
        }

    present = section.strength - record.absent_count
    percentage = (present / section.strength) * 100 if section.strength > 0 else 0.0

    return {
        "present": present,
        "absent": record.absent_count,
        "percentage": round(percentage, 1),
        "status": SessionStatus.RECORDED,
    }


@router.get("/college", response_model=CollegeStatsResponse)
def get_college_stats(
    target_date: date = Query(..., alias="date"),
    threshold: float = Query(75),
    db: Session = Depends(get_db),
):
    """
    Get institution-wide statistics for a given date.
    Only includes 'recorded' sections in averages (not pending or no_session).
    """
    departments = db.query(Department).all()

    total_present = 0
    total_strength = 0
    total_classes = 0
    classes_below = 0
    classes_recorded = 0
    classes_pending = 0
    classes_no_session = 0

    dept_stats_list = []

    for dept in departments:
        sections = db.query(Section).filter_by(department_id=dept.id).all()

        dept_present = 0
        dept_strength = 0
        dept_below = 0
        dept_recorded = 0
        dept_pending = 0
        dept_no_session = 0

        for section in sections:
            att = get_section_attendance(db, section, target_date)
            total_classes += 1

            if att["status"] == SessionStatus.RECORDED:
                dept_recorded += 1
                classes_recorded += 1
                dept_present += att["present"]
                dept_strength += section.strength
                total_present += att["present"]
                total_strength += section.strength
                if att["percentage"] < threshold:
                    dept_below += 1
                    classes_below += 1
            elif att["status"] == SessionStatus.PENDING:
                dept_pending += 1
                classes_pending += 1
            else:
                dept_no_session += 1
                classes_no_session += 1

        dept_avg = (dept_present / dept_strength * 100) if dept_strength > 0 else 0.0

        dept_stats_list.append(DepartmentStats(
            id=str(dept.id),
            name=dept.name,
            code=dept.code,
            average_percentage=round(dept_avg, 1),
            total_present=dept_present,
            total_strength=dept_strength,
            sections_below_threshold=dept_below,
            sections_total=len(sections),
            sections_recorded=dept_recorded,
            sections_pending=dept_pending,
            sections_no_session=dept_no_session,
        ))

    overall_pct = (total_present / total_strength * 100) if total_strength > 0 else 0.0

    return CollegeStatsResponse(
        date=target_date.isoformat(),
        overall_percentage=round(overall_pct, 1),
        total_present=total_present,
        total_strength=total_strength,
        total_classes=total_classes,
        classes_below_threshold=classes_below,
        classes_recorded=classes_recorded,
        classes_pending=classes_pending,
        classes_no_session=classes_no_session,
        department_stats=dept_stats_list,
    )


@router.get("/chronic-offenders", response_model=ChronicOffendersResponse)
def get_chronic_offenders(
    threshold: float = Query(75),
    min_days: int = Query(3, alias="minDays"),
    db: Session = Depends(get_db),
):
    """
    Find sections that have been below threshold for N consecutive days.
    Only counts 'recorded' days - no_session and pending are skipped.
    """
    sections = db.query(Section).all()
    offenders = []

    for section in sections:
        # Get recent records, ordered by date descending
        records = (
            db.query(AttendanceRecord)
            .filter(AttendanceRecord.section_id == section.id)
            .order_by(AttendanceRecord.date.desc())
            .limit(30)  # Look at last 30 records max
            .all()
        )

        consecutive = 0
        current_pct = 0.0

        for record in records:
            present = section.strength - record.absent_count
            pct = (present / section.strength * 100) if section.strength > 0 else 0.0

            if pct < threshold:
                consecutive += 1
                if consecutive == 1:
                    current_pct = pct
            else:
                break

        if consecutive >= min_days:
            dept = db.get(Department, section.department_id)
            offenders.append(ChronicOffender(
                section_id=str(section.id),
                section_name=section.name,
                department_id=str(dept.id),
                department_code=dept.code,
                department_name=dept.name,
                consecutive_days_below=consecutive,
                current_percentage=round(current_pct, 1),
                year=section.year,
                semester=section.semester,
            ))

    # Sort by consecutive days descending
    offenders.sort(key=lambda x: x.consecutive_days_below, reverse=True)

    return ChronicOffendersResponse(
        threshold=threshold,
        min_consecutive_days=min_days,
        offenders=offenders,
    )


@router.get("/biggest-drop", response_model=BiggestDropResponse)
def get_biggest_drop(
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """
    Find the section with the biggest day-over-day attendance decline.
    """
    # Find previous working day
    prev_date = target_date - timedelta(days=1)
    while prev_date > target_date - timedelta(days=7):
        calendar = db.query(CalendarDay).filter_by(date=prev_date).first()
        if calendar is None or calendar.is_working_day:
            break
        prev_date -= timedelta(days=1)

    sections = db.query(Section).all()
    biggest_drop: Optional[BiggestDrop] = None
    max_drop = 0.0

    for section in sections:
        today_record = db.query(AttendanceRecord).filter_by(
            section_id=section.id, date=target_date
        ).first()
        prev_record = db.query(AttendanceRecord).filter_by(
            section_id=section.id, date=prev_date
        ).first()

        if not today_record or not prev_record:
            continue

        today_pct = (section.strength - today_record.absent_count) / section.strength * 100
        prev_pct = (section.strength - prev_record.absent_count) / section.strength * 100
        drop = prev_pct - today_pct

        if drop > max_drop:
            max_drop = drop
            dept = db.get(Department, section.department_id)
            biggest_drop = BiggestDrop(
                section_id=str(section.id),
                section_name=section.name,
                department_id=str(dept.id),
                department_code=dept.code,
                department_name=dept.name,
                drop_percentage=round(drop, 1),
                current_percentage=round(today_pct, 1),
                previous_percentage=round(prev_pct, 1),
                year=section.year,
                semester=section.semester,
            )

    return BiggestDropResponse(
        date=target_date.isoformat(),
        previous_date=prev_date.isoformat() if biggest_drop else None,
        drop=biggest_drop,
    )


@router.get("/biggest-movers", response_model=BiggestMoversResponse)
def get_biggest_movers(
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """
    Find sections with biggest week-over-week changes.
    Returns top 5 risers and top 5 fallers.
    """
    sections = db.query(Section).all()
    movers = []

    # Define week ranges
    current_week_end = target_date
    current_week_start = target_date - timedelta(days=4)
    prev_week_end = current_week_start - timedelta(days=1)
    prev_week_start = prev_week_end - timedelta(days=4)

    for section in sections:
        # Current week records
        current_records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.section_id == section.id,
                AttendanceRecord.date >= current_week_start,
                AttendanceRecord.date <= current_week_end,
            )
            .all()
        )

        # Previous week records
        prev_records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.section_id == section.id,
                AttendanceRecord.date >= prev_week_start,
                AttendanceRecord.date <= prev_week_end,
            )
            .all()
        )

        if not current_records or not prev_records:
            continue

        # Calculate weighted averages
        current_present = sum(section.strength - r.absent_count for r in current_records)
        current_strength = section.strength * len(current_records)
        current_avg = (current_present / current_strength * 100) if current_strength > 0 else 0.0

        prev_present = sum(section.strength - r.absent_count for r in prev_records)
        prev_strength = section.strength * len(prev_records)
        prev_avg = (prev_present / prev_strength * 100) if prev_strength > 0 else 0.0

        delta = current_avg - prev_avg
        dept = db.get(Department, section.department_id)

        movers.append(BiggestMover(
            section_id=str(section.id),
            section_name=section.name,
            department_id=str(dept.id),
            department_code=dept.code,
            department_name=dept.name,
            current_week_avg=round(current_avg, 1),
            previous_week_avg=round(prev_avg, 1),
            delta=round(delta, 1),
            year=section.year,
            semester=section.semester,
        ))

    # Sort by absolute delta
    movers.sort(key=lambda x: abs(x.delta), reverse=True)

    risers = [m for m in movers if m.delta > 0][:5]
    fallers = [m for m in movers if m.delta < 0][:5]

    return BiggestMoversResponse(risers=risers, fallers=fallers)
