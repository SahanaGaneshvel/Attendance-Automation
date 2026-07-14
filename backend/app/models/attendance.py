"""
Attendance models - the core data for tracking class attendance.
CRITICAL: status field determines how records affect aggregations.
"""
from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from app.db import Base
import enum


class SessionStatus(str, enum.Enum):
    """
    CRITICAL: Day state for attendance records.
    - recorded: Attendance was taken, counts in averages
    - no_session: No class scheduled (holiday, lab day, etc.) - EXCLUDED from averages
    - pending: Working day but not yet recorded - EXCLUDED from averages

    A no_session day counting as 0% is a DATA-CORRUPTING BUG.
    """
    RECORDED = "recorded"
    NO_SESSION = "no_session"
    PENDING = "pending"


class AttendanceRecord(Base):
    """
    Per-class daily attendance record.
    Unit is CLASS, not student. present = strength_snapshot - absent_count.
    """
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    date = Column(Date, nullable=False)

    # Status determines aggregation behavior - CRITICAL
    status = Column(
        Enum(SessionStatus),
        nullable=False,
        default=SessionStatus.PENDING
    )

    # Only meaningful when status = RECORDED
    absent_count = Column(Integer, nullable=True)

    # Freeze strength at record time - historical accuracy
    strength_snapshot = Column(Integer, nullable=False)

    # Audit fields
    source = Column(String, nullable=False, default="manual")  # 'manual' or 'erp'
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Reason for no_session (optional)
    no_session_reason = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("section_id", "date", name="uq_section_date"),
    )

    section = relationship("Section", back_populates="attendance_records")
    created_by_user = relationship("User", foreign_keys=[created_by])

    @property
    def present_count(self) -> int:
        """Derived: present = strength - absent."""
        if self.status != SessionStatus.RECORDED or self.absent_count is None:
            return 0
        return self.strength_snapshot - self.absent_count

    @property
    def percentage(self) -> float:
        """Derived: percentage = present / strength * 100."""
        if self.status != SessionStatus.RECORDED or self.strength_snapshot == 0:
            return 0.0
        return (self.present_count / self.strength_snapshot) * 100


class AttendanceAbsentee(Base):
    """
    Individual absentee tracking (optional - for drill-down).
    The source of truth is absent_count on AttendanceRecord.
    """
    __tablename__ = "attendance_absentees"

    record_id = Column(Integer, ForeignKey("attendance_records.id"), primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), primary_key=True)

    record = relationship("AttendanceRecord")
    student = relationship("Student")
