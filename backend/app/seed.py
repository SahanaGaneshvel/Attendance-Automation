"""
Seed script for test data.
Includes:
- One school with multiple departments
- Sections with varied attendance
- CRITICAL: Holiday (no_session) and pending days for testing aggregation
- Users for each role
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.models import (
    School, Department, Section, Student, User,
    AttendanceRecord, SessionStatus, CalendarDay
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_database(db: Session):
    """Seed the database with test data."""

    # Clear existing data (for dev only)
    db.query(AttendanceRecord).delete()
    db.query(Student).delete()
    db.query(Section).delete()
    db.query(Department).delete()
    db.query(School).delete()
    db.query(User).delete()
    db.query(CalendarDay).delete()
    db.commit()

    # =========================================================================
    # 1. Create School
    # =========================================================================
    school = School(
        id=1,
        name="School of Computing",
        code="SOC",
        path="/1"
    )
    db.add(school)
    db.flush()

    # =========================================================================
    # 2. Create Departments
    # =========================================================================
    departments = [
        Department(id=1, school_id=1, name="AI & Data Science", code="AIDS", path="/1/1"),
        Department(id=2, school_id=1, name="Computer Science", code="CSE", path="/1/2"),
        Department(id=3, school_id=1, name="Information Technology", code="IT", path="/1/3"),
        Department(id=4, school_id=1, name="Cyber Security", code="CYBER", path="/1/4"),
    ]
    for dept in departments:
        db.add(dept)
    db.flush()

    # =========================================================================
    # 3. Create Sections (classes)
    # =========================================================================
    sections = []
    section_id = 1

    for dept in departments:
        # Year 2, 3, 4 with sections A, B, C (some depts have fewer)
        num_sections = 3 if dept.code in ["AIDS", "CSE"] else 2

        for year in [2, 3, 4]:
            for i in range(num_sections):
                section_name = chr(65 + i)  # A, B, C
                strength = 55 + (section_id % 10)  # Vary strength 55-65

                section = Section(
                    id=section_id,
                    department_id=dept.id,
                    name=section_name,
                    year=year,
                    semester=year * 2 - 1,  # Year 2 -> Sem 3, Year 3 -> Sem 5, etc.
                    stream=dept.code,
                    strength=strength,
                    path=f"/1/{dept.id}/{section_id}"
                )
                sections.append(section)
                db.add(section)
                section_id += 1

    db.flush()

    # =========================================================================
    # 4. Create Users (one for each role)
    # =========================================================================
    users = [
        # Teachers (assigned to specific sections)
        User(
            id=1,
            name="Dr. Priya Sharma",
            email="teacher@college.edu",
            password_hash=hash_password("password"),
            role="teacher",
            scope_section_id=1,  # AIDS Year 2 Section A
        ),
        User(
            id=2,
            name="Prof. Rahul Kumar",
            email="teacher2@college.edu",
            password_hash=hash_password("password"),
            role="teacher",
            scope_section_id=2,
        ),
        # HODs (assigned to departments)
        User(
            id=3,
            name="Dr. Sunita Verma",
            email="hod@college.edu",
            password_hash=hash_password("password"),
            role="hod",
            scope_department_id=1,  # AIDS
        ),
        User(
            id=4,
            name="Dr. Amit Patel",
            email="hod.cse@college.edu",
            password_hash=hash_password("password"),
            role="hod",
            scope_department_id=2,  # CSE
        ),
        # Dean (school-level scope)
        User(
            id=5,
            name="Dr. Ramesh Gupta",
            email="dean@college.edu",
            password_hash=hash_password("password"),
            role="dean",
            scope_school_id=1,
        ),
        # Admin (full access)
        User(
            id=6,
            name="System Admin",
            email="admin@college.edu",
            password_hash=hash_password("password"),
            role="admin",
        ),
    ]
    for user in users:
        db.add(user)
    db.flush()

    # =========================================================================
    # 5. Create Calendar with holidays
    # =========================================================================
    today = date.today()
    start_date = today - timedelta(days=30)

    # Define holidays
    holidays = {
        today - timedelta(days=7): "Republic Day",  # A week ago
        today - timedelta(days=14): "Pongal",       # Two weeks ago
    }

    current = start_date
    while current <= today:
        is_sunday = current.weekday() == 6
        is_holiday = current in holidays

        calendar_day = CalendarDay(
            date=current,
            is_working_day=not (is_sunday or is_holiday),
            is_holiday=is_holiday,
            holiday_name=holidays.get(current),
            academic_year="2025-26"
        )
        db.add(calendar_day)
        current += timedelta(days=1)

    db.flush()

    # =========================================================================
    # 6. Create Attendance Records
    # CRITICAL: Include recorded, no_session, and pending days
    # =========================================================================
    import random
    random.seed(42)  # Reproducible

    working_days = [
        d for d in (start_date + timedelta(days=i) for i in range(31))
        if d.weekday() != 6 and d not in holidays and d <= today
    ]

    for section in sections:
        for day in working_days:
            # Skip today for some sections (to test pending)
            if day == today and section.id % 3 == 0:
                continue  # Leave as pending

            # Check if this is a no_session day for this section
            # (e.g., lab day for section C on Wednesdays)
            is_no_session = (
                section.name == "C" and
                day.weekday() == 2 and  # Wednesday
                section.year == 3  # Year 3 only
            )

            if is_no_session:
                record = AttendanceRecord(
                    section_id=section.id,
                    date=day,
                    status=SessionStatus.NO_SESSION,
                    absent_count=None,
                    strength_snapshot=section.strength,
                    source="manual",
                    no_session_reason="Lab session - no first hour",
                    created_by=1,
                )
            else:
                # Generate realistic attendance (70-95% present)
                base_attendance = 0.85
                # Add some variance
                daily_variance = random.uniform(-0.12, 0.08)
                attendance_rate = max(0.65, min(0.98, base_attendance + daily_variance))

                absent_count = int(section.strength * (1 - attendance_rate))

                record = AttendanceRecord(
                    section_id=section.id,
                    date=day,
                    status=SessionStatus.RECORDED,
                    absent_count=absent_count,
                    strength_snapshot=section.strength,
                    source="manual",
                    created_by=1,
                )

            db.add(record)

    db.commit()
    print(f"Seeded: 1 school, {len(departments)} departments, {len(sections)} sections, {len(users)} users")
    print(f"Attendance records include RECORDED, NO_SESSION, and PENDING states for testing")


if __name__ == "__main__":
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
