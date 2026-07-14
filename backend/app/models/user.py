"""
User model - authentication and role-based access control.
"""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

    # Role determines dashboard and permissions
    # 'teacher' | 'hod' | 'dean' | 'admin'
    role = Column(String, nullable=False)

    # Scope - what the user can see/manage
    # Teacher: their assigned section(s)
    # HOD: their department
    # Dean: their school (or all schools for admin)
    scope_section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    scope_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    scope_school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)

    scope_section = relationship("Section")
    scope_department = relationship("Department")
    scope_school = relationship("School")
