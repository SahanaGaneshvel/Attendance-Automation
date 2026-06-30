from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'teacher' | 'hod' | 'dean' | 'admin'
    scope_section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)
    scope_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    scope_section = relationship("Section")
    scope_department = relationship("Department")