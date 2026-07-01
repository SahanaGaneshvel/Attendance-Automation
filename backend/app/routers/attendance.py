from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from app.db import get_db
from app.models import AttendanceRecord, Section

router = APIRouter(prefix="/attendance", tags=["attendance"])


class AttendanceEntry(BaseModel):
    section_id: int
    date: date
    absent_count: int


@router.post("/")
def submit_attendance(entry: AttendanceEntry, db: Session = Depends(get_db)):
    # Check section exists
    section = db.get(Section, entry.section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Check absent count makes sense
    if entry.absent_count < 0 or entry.absent_count > section.strength:
        raise HTTPException(
            status_code=400,
            detail=f"Absent count must be between 0 and {section.strength}"
        )

    # Upsert — update if record exists for this section+date, else create
    record = db.query(AttendanceRecord).filter_by(
        section_id=entry.section_id,
        date=entry.date
    ).first()

    if record:
        record.absent_count = entry.absent_count
        record.source = "manual"
    else:
        record = AttendanceRecord(
            section_id=entry.section_id,
            date=entry.date,
            absent_count=entry.absent_count,
            source="manual",
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    present = section.strength - record.absent_count
    pct = round((present / section.strength) * 100, 1)

    return {
        "message": "Attendance saved",
        "section": section.name,
        "date": record.date.isoformat(),
        "absent": record.absent_count,
        "present": present,
        "pct": pct,
    }