import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db import SessionLocal
from app.models import Department, Section

db = SessionLocal()

# ── 1. Create the department ─────────────────────────────────────────
dept_name = "Intelligent Systems and Cybersecurity"
dept_code = "ISC"

dept = db.query(Department).filter_by(code=dept_code).first()
if not dept:
    dept = Department(name=dept_name, code=dept_code)
    db.add(dept)
    db.flush()
    print(f"Created department: {dept_name}")
else:
    print(f"Department already exists: {dept_name}")

# ── 2. Section data from the roster file ─────────────────────────────
# (year, semester, section_name, strength)
sections_data = [
    ("II",  3, "AIDS A", 59),
    ("II",  3, "AIDS-B", 56),
    ("II",  3, "CYBER",  37),
    ("II",  3, "AIML",   55),
    ("III", 5, "AIDS A", 58),
    ("III", 5, "AIDS B", 50),
    ("III", 5, "CYBER",  31),
    ("III", 5, "AIML",   61),
    ("IV",  7, "AIDS A", 61),
    ("IV",  7, "AIDS B", 61),
    ("IV",  7, "AIML",   47),
    ("IV",  7, "CYBER",  41),
]

# ── 3. Insert sections (skip if already exists) ──────────────────────
created_count = 0
for year, semester, name, strength in sections_data:
    exists = db.query(Section).filter_by(
        department_id=dept.id, name=name, year=year, semester=semester
    ).first()
    if exists:
        continue
    section = Section(
        department_id=dept.id,
        name=name,
        year=year,
        semester=semester,
        strength=strength,
    )
    db.add(section)
    created_count += 1

db.commit()
print(f"Created {created_count} sections.")
print("Seed complete.")