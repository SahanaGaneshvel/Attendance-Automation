"""
Initialize the database with all tables.
For development: drops and recreates all tables.
"""
from app.db import engine, Base
from app.models import (
    School, Department, Section, Student,
    AttendanceRecord, AttendanceAbsentee, User,
    CalendarDay, DepartmentCalendarOverride, SectionNoSession
)


def init_db(drop_all: bool = False):
    """
    Initialize the database.

    Args:
        drop_all: If True, drops all tables first (for dev only!)
    """
    if drop_all:
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)

    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized!")


if __name__ == "__main__":
    import sys
    drop = "--drop" in sys.argv or "-d" in sys.argv
    init_db(drop_all=drop)
