from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db import Base

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    date = Column(Date, nullable=False)
    source = Column(String, nullable=False)  # 'manual' or 'erp'
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (UniqueConstraint("section_id", "date", name="uq_section_date"),)

    section = relationship("Section")


class AttendanceAbsentee(Base):
    __tablename__ = "attendance_absentees"

    record_id = Column(Integer, ForeignKey("attendance_records.id"), primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), primary_key=True)

    record = relationship("AttendanceRecord")
    student = relationship("Student")