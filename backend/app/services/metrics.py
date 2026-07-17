"""
Metrics Service - CRITICAL aggregation logic.

GROUND TRUTH:
- Aggregation is STRENGTH-WEIGHTED, never mean-of-means
- Only RECORDED status counts in averages
- NO_SESSION and PENDING are EXCLUDED from all averages
- A no_session day counting as 0% is a DATA-CORRUPTING BUG
- 75% is binary: >=75 green, <75 red (no amber)
"""
from sqlalchemy.orm import Session
from datetime import date as Date
from typing import Optional
from app.models import Section, AttendanceRecord, Department, School, SessionStatus


# ============================================================================
# Core Attendance Calculations
# ============================================================================

def get_section_status(db: Session, section_id: int, target_date: Date) -> SessionStatus:
    """
    Get the status for a section on a given date.
    Returns PENDING if no record exists.
    """
    record = db.query(AttendanceRecord).filter_by(
        section_id=section_id, date=target_date
    ).first()

    if not record:
        return SessionStatus.PENDING

    return record.status


def get_section_attendance(
    db: Session,
    section_id: int,
    target_date: Date
) -> dict:
    """
    Get attendance data for a single section on a date.
    Returns status, present, absent, strength, percentage.

    CRITICAL: Only RECORDED status has meaningful percentage.
    NO_SESSION and PENDING return percentage=None (not 0!).
    """
    section = db.get(Section, section_id)
    if not section:
        return None

    record = db.query(AttendanceRecord).filter_by(
        section_id=section_id, date=target_date
    ).first()

    if not record:
        return {
            "section_id": str(section_id),
            "status": SessionStatus.PENDING.value,
            "strength": section.strength,
            "present": None,
            "absent": None,
            "percentage": None,  # NOT 0!
        }

    if record.status == SessionStatus.NO_SESSION:
        return {
            "section_id": str(section_id),
            "status": SessionStatus.NO_SESSION.value,
            "strength": record.strength_snapshot,
            "present": None,
            "absent": None,
            "percentage": None,  # NOT 0!
            "reason": record.no_session_reason,
        }

    # RECORDED - calculate percentage
    present = record.strength_snapshot - (record.absent_count or 0)
    percentage = (present / record.strength_snapshot * 100) if record.strength_snapshot > 0 else 0

    return {
        "section_id": str(section_id),
        "status": SessionStatus.RECORDED.value,
        "strength": record.strength_snapshot,
        "present": present,
        "absent": record.absent_count or 0,
        "percentage": round(percentage, 1),
    }


def daily_section_pct(db: Session, section_id: int, target_date: Date) -> Optional[float]:
    """
    Returns today's attendance % for one section.
    Returns None if not RECORDED (pending or no_session).
    """
    att = get_section_attendance(db, section_id, target_date)
    if not att or att["status"] != SessionStatus.RECORDED.value:
        return None
    return att["percentage"]


# ============================================================================
# Weighted Aggregations - EXCLUDES pending and no_session
# ============================================================================

def department_avg(db: Session, department_id: int, target_date: Date) -> dict:
    """
    Weighted average across all RECORDED sections in a department.

    Returns:
        {
            "percentage": float | None,  # None if no recorded sections
            "total_present": int,
            "total_strength": int,
            "recorded_count": int,
            "pending_count": int,
            "no_session_count": int,
        }
    """
    sections = db.query(Section).filter_by(department_id=department_id).all()

    total_present = 0
    total_strength = 0
    recorded_count = 0
    pending_count = 0
    no_session_count = 0

    for section in sections:
        att = get_section_attendance(db, section.id, target_date)

        if att["status"] == SessionStatus.RECORDED.value:
            recorded_count += 1
            total_present += att["present"]
            total_strength += att["strength"]
        elif att["status"] == SessionStatus.PENDING.value:
            pending_count += 1
        else:
            no_session_count += 1

    if total_strength == 0:
        return {
            "percentage": None,
            "total_present": 0,
            "total_strength": 0,
            "recorded_count": recorded_count,
            "pending_count": pending_count,
            "no_session_count": no_session_count,
        }

    percentage = round((total_present / total_strength) * 100, 1)

    return {
        "percentage": percentage,
        "total_present": total_present,
        "total_strength": total_strength,
        "recorded_count": recorded_count,
        "pending_count": pending_count,
        "no_session_count": no_session_count,
    }


def school_avg(db: Session, school_id: int, target_date: Date) -> dict:
    """
    Weighted average across all RECORDED sections in a school.
    """
    departments = db.query(Department).filter_by(school_id=school_id).all()

    total_present = 0
    total_strength = 0
    recorded_count = 0
    pending_count = 0
    no_session_count = 0

    for dept in departments:
        dept_stats = department_avg(db, dept.id, target_date)
        total_present += dept_stats["total_present"]
        total_strength += dept_stats["total_strength"]
        recorded_count += dept_stats["recorded_count"]
        pending_count += dept_stats["pending_count"]
        no_session_count += dept_stats["no_session_count"]

    if total_strength == 0:
        return {
            "percentage": None,
            "total_present": 0,
            "total_strength": 0,
            "recorded_count": recorded_count,
            "pending_count": pending_count,
            "no_session_count": no_session_count,
        }

    percentage = round((total_present / total_strength) * 100, 1)

    return {
        "percentage": percentage,
        "total_present": total_present,
        "total_strength": total_strength,
        "recorded_count": recorded_count,
        "pending_count": pending_count,
        "no_session_count": no_session_count,
    }


def college_avg(db: Session, target_date: Date) -> dict:
    """
    Weighted average across every RECORDED section in the college.
    """
    sections = db.query(Section).all()

    total_present = 0
    total_strength = 0
    recorded_count = 0
    pending_count = 0
    no_session_count = 0

    for section in sections:
        att = get_section_attendance(db, section.id, target_date)

        if att["status"] == SessionStatus.RECORDED.value:
            recorded_count += 1
            total_present += att["present"]
            total_strength += att["strength"]
        elif att["status"] == SessionStatus.PENDING.value:
            pending_count += 1
        else:
            no_session_count += 1

    if total_strength == 0:
        return {
            "percentage": None,
            "total_present": 0,
            "total_strength": 0,
            "recorded_count": recorded_count,
            "pending_count": pending_count,
            "no_session_count": no_session_count,
        }

    percentage = round((total_present / total_strength) * 100, 1)

    return {
        "percentage": percentage,
        "total_present": total_present,
        "total_strength": total_strength,
        "recorded_count": recorded_count,
        "pending_count": pending_count,
        "no_session_count": no_session_count,
    }


# ============================================================================
# Threshold Calculations
# ============================================================================

def classes_above_below(
    db: Session,
    target_date: Date,
    threshold: float = 75,
    department_id: Optional[int] = None,
    school_id: Optional[int] = None,
) -> dict:
    """
    Counts how many RECORDED sections are above/below the threshold.
    Pending and no_session are counted separately, NOT as below.

    Returns:
        {
            "above": int,
            "below": int,
            "pending": int,
            "no_session": int,
        }
    """
    query = db.query(Section)

    if department_id:
        query = query.filter_by(department_id=department_id)
    elif school_id:
        dept_ids = [d.id for d in db.query(Department).filter_by(school_id=school_id).all()]
        query = query.filter(Section.department_id.in_(dept_ids))

    sections = query.all()
    above = 0
    below = 0
    pending = 0
    no_session = 0

    for section in sections:
        att = get_section_attendance(db, section.id, target_date)

        if att["status"] == SessionStatus.RECORDED.value:
            if att["percentage"] >= threshold:
                above += 1
            else:
                below += 1
        elif att["status"] == SessionStatus.PENDING.value:
            pending += 1
        else:
            no_session += 1

    return {
        "above": above,
        "below": below,
        "pending": pending,
        "no_session": no_session,
    }


# ============================================================================
# Trend Calculations
# ============================================================================

def section_trend(
    db: Session,
    section_id: int,
    from_date: Date,
    to_date: Date
) -> list[dict]:
    """
    Returns a list of {date, percentage, status} for charting.
    Includes all dates, with status to determine rendering.
    """
    section = db.get(Section, section_id)
    if not section:
        return []

    records = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.section_id == section_id,
            AttendanceRecord.date >= from_date,
            AttendanceRecord.date <= to_date,
        )
        .order_by(AttendanceRecord.date)
        .all()
    )

    result = []
    for r in records:
        if r.status == SessionStatus.RECORDED:
            present = r.strength_snapshot - (r.absent_count or 0)
            pct = round((present / r.strength_snapshot) * 100, 1) if r.strength_snapshot > 0 else 0
            result.append({
                "date": r.date.isoformat(),
                "percentage": pct,
                "status": "recorded",
            })
        elif r.status == SessionStatus.NO_SESSION:
            result.append({
                "date": r.date.isoformat(),
                "percentage": None,
                "status": "no_session",
            })
        else:
            result.append({
                "date": r.date.isoformat(),
                "percentage": None,
                "status": "pending",
            })

    return result


def department_trend(
    db: Session,
    department_id: int,
    from_date: Date,
    to_date: Date
) -> list[dict]:
    """
    Returns weighted department average trend.
    """
    from datetime import timedelta

    result = []
    current = from_date

    while current <= to_date:
        stats = department_avg(db, department_id, current)

        if stats["recorded_count"] > 0:
            result.append({
                "date": current.isoformat(),
                "percentage": stats["percentage"],
                "status": "recorded",
            })
        elif stats["no_session_count"] > 0 and stats["pending_count"] == 0:
            result.append({
                "date": current.isoformat(),
                "percentage": None,
                "status": "no_session",
            })
        # Skip days with no data at all

        current += timedelta(days=1)

    return result


def college_trend(
    db: Session,
    from_date: Date,
    to_date: Date
) -> list[dict]:
    """
    Returns weighted college-wide average trend.
    """
    from datetime import timedelta

    result = []
    current = from_date

    while current <= to_date:
        stats = college_avg(db, current)

        if stats["recorded_count"] > 0:
            result.append({
                "date": current.isoformat(),
                "percentage": stats["percentage"],
                "status": "recorded",
            })

        current += timedelta(days=1)

    return result


# ============================================================================
# Chronic Offenders (classes below threshold for N consecutive days)
# ============================================================================

def get_chronic_offenders(
    db: Session,
    threshold: float = 75,
    min_consecutive_days: int = 3,
    department_id: Optional[int] = None,
) -> list[dict]:
    """
    Find sections that have been below threshold for N consecutive RECORDED days.
    No_session days don't break the streak but don't count toward it.
    """
    query = db.query(Section)
    if department_id:
        query = query.filter_by(department_id=department_id)

    sections = query.all()
    offenders = []

    for section in sections:
        # Get recent records, ordered by date descending
        records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.section_id == section.id,
                AttendanceRecord.status == SessionStatus.RECORDED,
            )
            .order_by(AttendanceRecord.date.desc())
            .limit(30)
            .all()
        )

        consecutive = 0
        current_pct = 0.0

        for record in records:
            pct = record.percentage
            if pct < threshold:
                consecutive += 1
                if consecutive == 1:
                    current_pct = pct
            else:
                break

        if consecutive >= min_consecutive_days:
            dept = db.get(Department, section.department_id)
            offenders.append({
                "section_id": str(section.id),
                "section_name": section.name,
                "department_id": str(dept.id) if dept else None,
                "department_code": dept.code if dept else None,
                "department_name": dept.name if dept else None,
                "year": section.year,
                "semester": section.semester,
                "consecutive_days": consecutive,
                "current_percentage": round(current_pct, 1),
            })

    # Sort by consecutive days descending
    offenders.sort(key=lambda x: x["consecutive_days"], reverse=True)
    return offenders


# ============================================================================
# Biggest Single-Day Drop
# ============================================================================

def get_biggest_drop(
    db: Session,
    target_date: Date,
    department_id: Optional[int] = None,
) -> Optional[dict]:
    """
    Find the section with the biggest drop from previous day to target date.
    Only compares RECORDED days (skips no_session/pending).
    """
    from datetime import timedelta

    query = db.query(Section)
    if department_id:
        query = query.filter_by(department_id=department_id)

    sections = query.all()
    biggest_drop = None

    for section in sections:
        # Get today's attendance
        today_att = get_section_attendance(db, section.id, target_date)
        if today_att["status"] != SessionStatus.RECORDED.value:
            continue

        # Find most recent previous RECORDED day
        previous_records = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.section_id == section.id,
                AttendanceRecord.date < target_date,
                AttendanceRecord.status == SessionStatus.RECORDED,
            )
            .order_by(AttendanceRecord.date.desc())
            .first()
        )

        if not previous_records:
            continue

        prev_pct = previous_records.percentage
        today_pct = today_att["percentage"]
        drop = prev_pct - today_pct

        if drop > 0 and (biggest_drop is None or drop > biggest_drop["drop"]):
            dept = db.get(Department, section.department_id)
            biggest_drop = {
                "section_id": str(section.id),
                "section_name": section.name,
                "department_id": str(dept.id) if dept else None,
                "department_code": dept.code if dept else None,
                "department_name": dept.name if dept else None,
                "year": section.year,
                "drop": round(drop, 1),
                "previous_percentage": round(prev_pct, 1),
                "current_percentage": round(today_pct, 1),
                "previous_date": previous_records.date.isoformat(),
            }

    return biggest_drop
