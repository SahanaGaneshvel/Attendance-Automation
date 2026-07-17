from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional, Literal
from app.db import get_db
from app.models import AttendanceRecord, Section, SessionStatus, User
from app.services.auth import get_current_user

router = APIRouter(prefix="/attendance", tags=["attendance"])


class AttendanceSubmission(BaseModel):
    """
    Attendance submission payload.
    - For recorded attendance: provide absent_count
    - For no_session: provide no_session_reason (optional)
    """
    section_id: int
    date: date
    status: Literal["recorded", "no_session"] = "recorded"
    absent_count: Optional[int] = None
    no_session_reason: Optional[str] = None


class AttendanceResponse(BaseModel):
    """Response after submitting attendance."""
    message: str
    section_id: int
    section_name: str
    date: str
    status: str
    absent_count: Optional[int] = None
    present_count: Optional[int] = None
    strength: int
    percentage: Optional[float] = None


@router.post("/", response_model=AttendanceResponse)
def submit_attendance(
    entry: AttendanceSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit attendance for a section.

    Authorization:
    - Teachers can only submit for their assigned section
    - HODs can submit for any section in their department
    - Deans/Admins can submit for any section
    """
    # Get section
    section = db.get(Section, entry.section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Scope validation
    if current_user.role == "teacher":
        if current_user.scope_section_id != entry.section_id:
            raise HTTPException(
                status_code=403,
                detail="You can only submit attendance for your assigned section"
            )
    elif current_user.role == "hod":
        if current_user.scope_department_id != section.department_id:
            raise HTTPException(
                status_code=403,
                detail="You can only submit attendance for sections in your department"
            )
    # Dean and admin have full access

    # Validate based on status
    if entry.status == "recorded":
        if entry.absent_count is None:
            raise HTTPException(
                status_code=400,
                detail="absent_count is required when status is 'recorded'"
            )
        if entry.absent_count < 0 or entry.absent_count > section.strength:
            raise HTTPException(
                status_code=400,
                detail=f"Absent count must be between 0 and {section.strength}"
            )

    # Map string status to enum
    status_enum = SessionStatus.RECORDED if entry.status == "recorded" else SessionStatus.NO_SESSION

    # Upsert — update if record exists for this section+date, else create
    record = db.query(AttendanceRecord).filter_by(
        section_id=entry.section_id,
        date=entry.date
    ).first()

    if record:
        record.status = status_enum
        record.absent_count = entry.absent_count if entry.status == "recorded" else None
        record.no_session_reason = entry.no_session_reason if entry.status == "no_session" else None
        record.strength_snapshot = section.strength
        record.source = "manual"
        record.created_by = current_user.id
    else:
        record = AttendanceRecord(
            section_id=entry.section_id,
            date=entry.date,
            status=status_enum,
            absent_count=entry.absent_count if entry.status == "recorded" else None,
            no_session_reason=entry.no_session_reason if entry.status == "no_session" else None,
            strength_snapshot=section.strength,
            source="manual",
            created_by=current_user.id,
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    # Build response
    present = None
    pct = None
    if record.status == SessionStatus.RECORDED and record.absent_count is not None:
        present = record.strength_snapshot - record.absent_count
        pct = round((present / record.strength_snapshot) * 100, 1) if record.strength_snapshot > 0 else 0.0

    return AttendanceResponse(
        message="Attendance saved successfully",
        section_id=section.id,
        section_name=f"{section.stream} Year {section.year} {section.name}",
        date=record.date.isoformat(),
        status=record.status.value,
        absent_count=record.absent_count,
        present_count=present,
        strength=record.strength_snapshot,
        percentage=pct,
    )


@router.get("/{section_id}/{date_str}")
def get_attendance(
    section_id: int,
    date_str: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance record for a specific section and date."""
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    section = db.get(Section, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    record = db.query(AttendanceRecord).filter_by(
        section_id=section_id,
        date=target_date
    ).first()

    if not record:
        # No record = pending
        return {
            "section_id": section_id,
            "section_name": f"{section.stream} Year {section.year} {section.name}",
            "date": date_str,
            "status": "pending",
            "strength": section.strength,
            "absent_count": None,
            "present_count": None,
            "percentage": None,
        }

    present = None
    pct = None
    if record.status == SessionStatus.RECORDED and record.absent_count is not None:
        present = record.strength_snapshot - record.absent_count
        pct = round((present / record.strength_snapshot) * 100, 1) if record.strength_snapshot > 0 else 0.0

    return {
        "section_id": section_id,
        "section_name": f"{section.stream} Year {section.year} {section.name}",
        "date": date_str,
        "status": record.status.value,
        "strength": record.strength_snapshot,
        "absent_count": record.absent_count,
        "present_count": present,
        "percentage": pct,
        "no_session_reason": record.no_session_reason,
    }
