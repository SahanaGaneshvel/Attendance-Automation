"""
School model - the tier between Institution and Department.
Supports the full org tree: Institution → School → Department → Class (Section).
"""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db import Base


class School(Base):
    """
    A school within the institution (e.g., "School of Computing", "School of Engineering").
    For single-school pilots, seed one real school; the schema must still exist.
    """
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)

    # Materialized path for efficient subtree queries
    # Format: "/institution_id/school_id"
    path = Column(String, nullable=False, default="/1")

    departments = relationship("Department", back_populates="school")
