"""add calendar tables

Revision ID: a1b2c3d4e5f6
Revises: 099c9be931df
Create Date: 2026-07-05 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '099c9be931df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add calendar and session tracking tables."""
    # Calendar days - tracks working days and holidays
    op.create_table('calendar_days',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('is_working_day', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_holiday', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('holiday_name', sa.String(), nullable=True),
        sa.Column('academic_year', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('date')
    )
    op.create_index(op.f('ix_calendar_days_id'), 'calendar_days', ['id'], unique=False)
    op.create_index(op.f('ix_calendar_days_date'), 'calendar_days', ['date'], unique=True)

    # Department-level calendar overrides
    op.create_table('department_calendar_overrides',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('calendar_day_id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('is_working_day', sa.Boolean(), nullable=False),
        sa.Column('reason', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['calendar_day_id'], ['calendar_days.id'], ),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('calendar_day_id', 'department_id', name='uq_calendar_dept_override')
    )
    op.create_index(op.f('ix_department_calendar_overrides_id'), 'department_calendar_overrides', ['id'], unique=False)

    # Section no-session tracking
    op.create_table('section_no_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('section_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('reason', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['section_id'], ['sections.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('section_id', 'date', name='uq_section_no_session')
    )
    op.create_index(op.f('ix_section_no_sessions_id'), 'section_no_sessions', ['id'], unique=False)


def downgrade() -> None:
    """Remove calendar tables."""
    op.drop_index(op.f('ix_section_no_sessions_id'), table_name='section_no_sessions')
    op.drop_table('section_no_sessions')
    op.drop_index(op.f('ix_department_calendar_overrides_id'), table_name='department_calendar_overrides')
    op.drop_table('department_calendar_overrides')
    op.drop_index(op.f('ix_calendar_days_date'), table_name='calendar_days')
    op.drop_index(op.f('ix_calendar_days_id'), table_name='calendar_days')
    op.drop_table('calendar_days')
