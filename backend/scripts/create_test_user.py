import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db import SessionLocal
from app.models import User
from app.services.auth import hash_password

db = SessionLocal()

existing = db.query(User).filter_by(email="dean@test.com").first()
if existing:
    print("Test user already exists.")
else:
    user = User(
        name="Test Dean",
        email="dean@test.com",
        password_hash=hash_password("password123"),
        role="dean",
        scope_section_id=None,
        scope_department_id=None,
    )
    db.add(user)
    db.commit()
    print("Test user created: dean@test.com / password123")

db.close()