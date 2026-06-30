from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    roll_no = Column(String, nullable=False)
    name = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("section_id", "roll_no", name="uq_section_roll"),)

    section = relationship("Section")