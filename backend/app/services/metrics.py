from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Section, AttendanceRecord, Department


def daily_section_pct(db: Session, section_id: int, date) -> float | None:
    """
    Returns today's attendance % for one section.
    Formula: (strength - absent_count) / strength * 100
    """
    section = db.get(Section, section_id)
    if not section:
        return None

    record = db.query(AttendanceRecord).filter_by(
        section_id=section_id, date=date
    ).first()

    if not record:
        return None  # no attendance entered for this date yet

    present = section.strength - record.absent_count
    pct = (present / section.strength) * 100
    return round(pct, 1)


def department_avg(db: Session, department_id: int, date) -> float | None:
    """
    Weighted average across all sections in a department.
    Weighted by section strength, NOT a plain average of percentages.
    """
    sections = db.query(Section).filter_by(department_id=department_id).all()

    total_present = 0
    total_strength = 0

    for section in sections:
        record = db.query(AttendanceRecord).filter_by(
            section_id=section.id, date=date
        ).first()
        if not record:
            continue  # skip sections with no entry for this date
        present = section.strength - record.absent_count
        total_present += present
        total_strength += section.strength

    if total_strength == 0:
        return None

    return round((total_present / total_strength) * 100, 1)


def college_avg(db: Session, date) -> float | None:
    """
    Weighted average across every section in the college.
    """
    sections = db.query(Section).all()

    total_present = 0
    total_strength = 0

    for section in sections:
        record = db.query(AttendanceRecord).filter_by(
            section_id=section.id, date=date
        ).first()
        if not record:
            continue
        present = section.strength - record.absent_count
        total_present += present
        total_strength += section.strength

    if total_strength == 0:
        return None

    return round((total_present / total_strength) * 100, 1)


def section_trend(db: Session, section_id: int, from_date, to_date) -> list[dict]:
    """
    Returns a list of {date, pct} for charting, between two dates.
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
        present = section.strength - r.absent_count
        pct = round((present / section.strength) * 100, 1)
        result.append({"date": r.date.isoformat(), "pct": pct})

    return result


def classes_above_below(db: Session, date, threshold: float = 75) -> dict:
    """
    Counts how many sections are above/below the threshold today.
    """
    sections = db.query(Section).all()
    above = 0
    below = 0

    for section in sections:
        record = db.query(AttendanceRecord).filter_by(
            section_id=section.id, date=date
        ).first()
        if not record:
            continue
        present = section.strength - record.absent_count
        pct = (present / section.strength) * 100
        if pct >= threshold:
            above += 1
        else:
            below += 1

    return {"above": above, "below": below}