"""
Seed script for Attendance Automation
Creates: School → Department → Sections → Users (Teachers, HOD, Dean)

Data source: ISC Department roster for Academic Year 2026-27
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db import SessionLocal
from app.models import School, Department, Section, User
from app.services.auth import hash_password

db = SessionLocal()

# ── 1. Create the school (required parent of department) ───────────────
school_name = "School of Computing"
school_code = "SOC"

school = db.query(School).filter_by(code=school_code).first()
if not school:
    school = School(name=school_name, code=school_code, path="/1")
    db.add(school)
    db.flush()
    print(f"Created school: {school_name}")
else:
    print(f"School already exists: {school_name}")

# ── 2. Create the department ─────────────────────────────────────────
dept_name = "Intelligent Systems and Cybersecurity"
dept_code = "ISC"

dept = db.query(Department).filter_by(code=dept_code).first()
if not dept:
    dept = Department(name=dept_name, code=dept_code, school_id=school.id, path=f"/1/{school.id}")
    db.add(dept)
    db.flush()
    print(f"Created department: {dept_name}")
else:
    print(f"Department already exists: {dept_name}")

# ── 3. Section data with class teachers (Academic Year 2026-27) ───────
# (year_int, semester, section_name, strength, teacher_name, teacher_email)
sections_data = [
    # Year II - Semester 3
    (2, 3, "AIDS A", 59, "Ms Subashri R", "subashri.r@college.edu"),
    (2, 3, "AIDS B", 56, "Mr. Sharath P Raju", "sharath.raju@college.edu"),
    (2, 3, "CYBER", 37, "Dr. Christy Daniel", "christy.daniel@college.edu"),
    (2, 3, "AIML", 55, "Mr. Zahid Hussain", "zahid.hussain@college.edu"),
    # Year III - Semester 5
    (3, 5, "AIDS A", 58, "Ms. D. Nandhini", "nandhini.d@college.edu"),
    (3, 5, "AIDS B", 50, "Ms. Jeyavim Sherin R C", "jeyavim.sherin@college.edu"),
    (3, 5, "CYBER", 31, "Ms. Anusri P", "anusri.p@college.edu"),
    (3, 5, "AIML", 61, "Ms. Stefin Thomas Pallathu", "stefin.thomas@college.edu"),
    # Year IV - Semester 7
    (4, 7, "AIDS A", 61, "Ms. Abisheka Pon", "abisheka.pon@college.edu"),
    (4, 7, "AIDS B", 61, "Ms. Priyadharshini", "priyadharshini@college.edu"),
    (4, 7, "AIML", 47, "Mr. D. Anand Joseph Daniel", "anand.daniel@college.edu"),
    (4, 7, "CYBER", 41, "Ms. P. Aileen Chris", "aileen.chris@college.edu"),
]

# Default password for all seeded users (change in production!)
DEFAULT_PASSWORD = "password123"
password_hash = hash_password(DEFAULT_PASSWORD)

# ── 4. Insert sections and create teacher users ────────────────────────
sections_created = 0
teachers_created = 0

for year, semester, name, strength, teacher_name, teacher_email in sections_data:
    # Create or get section
    section = db.query(Section).filter_by(
        department_id=dept.id, name=name, year=year, semester=semester
    ).first()

    if not section:
        section = Section(
            department_id=dept.id,
            name=name,
            year=year,
            semester=semester,
            strength=strength,
            path=f"/1/{school.id}/{dept.id}",
        )
        db.add(section)
        db.flush()  # Get section.id
        sections_created += 1
    else:
        # Update strength if section exists
        section.strength = strength

    # Create teacher user if not exists
    teacher = db.query(User).filter_by(email=teacher_email).first()
    if not teacher:
        teacher = User(
            name=teacher_name,
            email=teacher_email,
            password_hash=password_hash,
            role="teacher",
            scope_section_id=section.id,
            scope_department_id=dept.id,
            scope_school_id=school.id,
        )
        db.add(teacher)
        teachers_created += 1
        print(f"  Created teacher: {teacher_name} -> {name} (Year {year})")

print(f"\nCreated {sections_created} sections, {teachers_created} teachers")

# ── 5. Create HOD for the department ───────────────────────────────────
hod_email = "hod.isc@college.edu"
hod = db.query(User).filter_by(email=hod_email).first()
if not hod:
    hod = User(
        name="Dr. HOD ISC",
        email=hod_email,
        password_hash=password_hash,
        role="hod",
        scope_department_id=dept.id,
        scope_school_id=school.id,
    )
    db.add(hod)
    print(f"Created HOD: {hod.name}")
else:
    print(f"HOD already exists: {hod.name}")

# ── 6. Create Dean for the school ──────────────────────────────────────
dean_email = "dean.soc@college.edu"
dean = db.query(User).filter_by(email=dean_email).first()
if not dean:
    dean = User(
        name="Dr. Dean School of Computing",
        email=dean_email,
        password_hash=password_hash,
        role="dean",
        scope_school_id=school.id,
    )
    db.add(dean)
    print(f"Created Dean: {dean.name}")
else:
    print(f"Dean already exists: {dean.name}")

# ── 7. Create Admin user ───────────────────────────────────────────────
admin_email = "admin@college.edu"
admin = db.query(User).filter_by(email=admin_email).first()
if not admin:
    admin = User(
        name="System Administrator",
        email=admin_email,
        password_hash=password_hash,
        role="admin",
        scope_school_id=school.id,
    )
    db.add(admin)
    print(f"Created Admin: {admin.name}")
else:
    print(f"Admin already exists: {admin.name}")

# ── Commit all changes ─────────────────────────────────────────────────
db.commit()
db.close()

print("\n" + "="*60)
print("SEED COMPLETE!")
print("="*60)
print(f"""
Login credentials (all users have the same password):
  Password: {DEFAULT_PASSWORD}

Sample logins:
  Teacher:  subashri.r@college.edu
  Teacher:  christy.daniel@college.edu
  HOD:      hod.isc@college.edu
  Dean:     dean.soc@college.edu
  Admin:    admin@college.edu
""")
