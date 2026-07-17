"""
Export router - CSV and report generation endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional
import csv
import io

from app.db import get_db
from app.models import User, Department, Section, AttendanceRecord, SessionStatus, School
from app.services.auth import get_current_user
from app.services.metrics import (
    department_avg,
    school_avg,
    college_avg,
    get_section_attendance,
)

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/attendance/csv")
def export_attendance_csv(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    department_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export attendance data as CSV for a date range.

    Columns: Date, Department, Section, Year, Semester, Strength, Status, Present, Absent, Percentage
    """
    # Role-based filtering
    sections_query = db.query(Section)

    if current_user.role == "teacher":
        # Teachers can only export their section
        if not current_user.scope_section_id:
            raise HTTPException(status_code=400, detail="No section assigned")
        sections_query = sections_query.filter_by(id=current_user.scope_section_id)
    elif current_user.role == "hod":
        # HODs can export their department
        if not current_user.scope_department_id:
            raise HTTPException(status_code=400, detail="No department assigned")
        sections_query = sections_query.filter_by(department_id=current_user.scope_department_id)
    elif current_user.role == "dean":
        # Deans can export their school
        if not current_user.scope_school_id:
            raise HTTPException(status_code=400, detail="No school assigned")
        dept_ids = [d.id for d in db.query(Department).filter_by(school_id=current_user.scope_school_id).all()]
        sections_query = sections_query.filter(Section.department_id.in_(dept_ids))
    # Admin can export everything

    # Filter by department if specified
    if department_id:
        sections_query = sections_query.filter_by(department_id=department_id)

    sections = sections_query.all()

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Date", "Department", "Section", "Year", "Semester",
        "Strength", "Status", "Present", "Absent", "Percentage"
    ])

    # Iterate through dates
    current = from_date
    while current <= to_date:
        for section in sections:
            dept = db.get(Department, section.department_id)
            att = get_section_attendance(db, section.id, current)

            writer.writerow([
                current.isoformat(),
                dept.code if dept else "",
                section.name,
                section.year,
                section.semester,
                att["strength"],
                att["status"],
                att["present"] if att["present"] is not None else "",
                att["absent"] if att["absent"] is not None else "",
                f"{att['percentage']:.1f}" if att["percentage"] is not None else "",
            ])

        current += timedelta(days=1)

    output.seek(0)

    filename = f"attendance_{from_date}_{to_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/summary/csv")
def export_summary_csv(
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export daily summary as CSV.

    For Dean: Department-level summary
    For HOD: Section-level summary for their department
    For Teacher: Their section only
    """
    output = io.StringIO()
    writer = csv.writer(output)

    if current_user.role == "teacher":
        # Teacher: single section summary
        if not current_user.scope_section_id:
            raise HTTPException(status_code=400, detail="No section assigned")

        section = db.get(Section, current_user.scope_section_id)
        dept = db.get(Department, section.department_id) if section else None
        att = get_section_attendance(db, current_user.scope_section_id, target_date)

        writer.writerow(["Section Summary", target_date.isoformat()])
        writer.writerow([])
        writer.writerow(["Section", "Department", "Strength", "Status", "Present", "Absent", "Percentage"])
        writer.writerow([
            section.name if section else "",
            dept.code if dept else "",
            att["strength"],
            att["status"],
            att["present"] if att["present"] is not None else "",
            att["absent"] if att["absent"] is not None else "",
            f"{att['percentage']:.1f}" if att["percentage"] is not None else "",
        ])

    elif current_user.role == "hod":
        # HOD: department sections summary
        if not current_user.scope_department_id:
            raise HTTPException(status_code=400, detail="No department assigned")

        dept = db.get(Department, current_user.scope_department_id)
        sections = db.query(Section).filter_by(department_id=current_user.scope_department_id).all()
        dept_stats = department_avg(db, current_user.scope_department_id, target_date)

        writer.writerow(["Department Summary", target_date.isoformat()])
        writer.writerow(["Department", dept.name if dept else ""])
        writer.writerow(["Overall Percentage", f"{dept_stats['percentage']:.1f}%" if dept_stats['percentage'] else "N/A"])
        writer.writerow(["Recorded", dept_stats["recorded_count"]])
        writer.writerow(["Pending", dept_stats["pending_count"]])
        writer.writerow([])
        writer.writerow(["Section", "Year", "Semester", "Strength", "Status", "Present", "Absent", "Percentage"])

        for section in sections:
            att = get_section_attendance(db, section.id, target_date)
            writer.writerow([
                section.name,
                section.year,
                section.semester,
                att["strength"],
                att["status"],
                att["present"] if att["present"] is not None else "",
                att["absent"] if att["absent"] is not None else "",
                f"{att['percentage']:.1f}" if att["percentage"] is not None else "",
            ])

    else:
        # Dean/Admin: school-wide department summary
        if current_user.role == "dean" and not current_user.scope_school_id:
            raise HTTPException(status_code=400, detail="No school assigned")

        # Get departments
        if current_user.role == "dean":
            departments = db.query(Department).filter_by(school_id=current_user.scope_school_id).all()
            school = db.get(School, current_user.scope_school_id)
            school_stats = school_avg(db, current_user.scope_school_id, target_date)
            writer.writerow(["School Summary", target_date.isoformat()])
            writer.writerow(["School", school.name if school else ""])
            writer.writerow(["Overall Percentage", f"{school_stats['percentage']:.1f}%" if school_stats['percentage'] else "N/A"])
        else:
            departments = db.query(Department).all()
            college_stats = college_avg(db, target_date)
            writer.writerow(["College Summary", target_date.isoformat()])
            writer.writerow(["Overall Percentage", f"{college_stats['percentage']:.1f}%" if college_stats['percentage'] else "N/A"])

        writer.writerow([])
        writer.writerow(["Department", "Code", "Percentage", "Recorded", "Pending", "No Session", "Total Present", "Total Strength"])

        for dept in departments:
            stats = department_avg(db, dept.id, target_date)
            writer.writerow([
                dept.name,
                dept.code,
                f"{stats['percentage']:.1f}" if stats['percentage'] else "N/A",
                stats["recorded_count"],
                stats["pending_count"],
                stats["no_session_count"],
                stats["total_present"],
                stats["total_strength"],
            ])

    output.seek(0)

    filename = f"summary_{target_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/report/csv")
def export_monthly_report_csv(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export monthly attendance report as CSV.
    Shows each section's daily attendance for the month.
    """
    from calendar import monthrange

    # Get date range for month
    _, last_day = monthrange(year, month)
    from_date = date(year, month, 1)
    to_date = date(year, month, last_day)

    # Role-based section filtering
    sections_query = db.query(Section)

    if current_user.role == "teacher":
        if not current_user.scope_section_id:
            raise HTTPException(status_code=400, detail="No section assigned")
        sections_query = sections_query.filter_by(id=current_user.scope_section_id)
    elif current_user.role == "hod":
        if not current_user.scope_department_id:
            raise HTTPException(status_code=400, detail="No department assigned")
        sections_query = sections_query.filter_by(department_id=current_user.scope_department_id)
    elif current_user.role == "dean":
        if not current_user.scope_school_id:
            raise HTTPException(status_code=400, detail="No school assigned")
        dept_ids = [d.id for d in db.query(Department).filter_by(school_id=current_user.scope_school_id).all()]
        sections_query = sections_query.filter(Section.department_id.in_(dept_ids))

    sections = sections_query.all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Generate date columns
    dates = []
    current = from_date
    while current <= to_date:
        dates.append(current)
        current += timedelta(days=1)

    # Header row
    header = ["Department", "Section", "Year", "Strength"]
    for d in dates:
        header.append(d.strftime("%d"))
    header.append("Average")
    writer.writerow(header)

    # Data rows
    for section in sections:
        dept = db.get(Department, section.department_id)
        row = [
            dept.code if dept else "",
            section.name,
            section.year,
            section.strength,
        ]

        total_pct = 0
        recorded_days = 0

        for d in dates:
            att = get_section_attendance(db, section.id, d)
            if att["status"] == SessionStatus.RECORDED.value and att["percentage"] is not None:
                row.append(f"{att['percentage']:.0f}")
                total_pct += att["percentage"]
                recorded_days += 1
            elif att["status"] == SessionStatus.NO_SESSION.value:
                row.append("NS")
            else:
                row.append("-")

        # Average
        avg = (total_pct / recorded_days) if recorded_days > 0 else None
        row.append(f"{avg:.1f}" if avg else "N/A")

        writer.writerow(row)

    output.seek(0)

    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    filename = f"monthly_report_{month_names[month]}_{year}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
