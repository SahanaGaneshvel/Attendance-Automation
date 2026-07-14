"""Phase 0: Model reconciliation - add School, status, strength_snapshot

Revision ID: b1c2d3e4f5g6
Revises: a1b2c3d4e5f6
Create Date: 2026-07-14 10:00:00.000000

This migration:
1. Adds School table (tier between Institution and Department)
2. Adds school_id FK to departments
3. Adds school_id FK to users
4. Adds status enum to attendance_records (recorded/no_session/pending)
5. Adds strength_snapshot to attendance_records
6. Adds path column to sections for materialized path queries
7. Adds stream column to sections
8. Changes year from String to Integer
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'b1c2d3e4f5g6'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create schools table
    op.create_table('schools',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('path', sa.String(), nullable=False, server_default='/1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_schools_id'), 'schools', ['id'], unique=False)

    # 2. Insert a default school for existing data
    op.execute("INSERT INTO schools (id, name, code, path) VALUES (1, 'School of Computing', 'SOC', '/1')")

    # 3. Add school_id to departments (nullable first for existing data)
    op.add_column('departments', sa.Column('school_id', sa.Integer(), nullable=True))
    op.add_column('departments', sa.Column('path', sa.String(), nullable=True))

    # Update existing departments to belong to default school
    op.execute("UPDATE departments SET school_id = 1, path = '/1/1/' || CAST(id AS TEXT)")

    # Now make school_id non-nullable and add FK
    op.alter_column('departments', 'school_id', nullable=False)
    op.create_foreign_key('fk_departments_school_id', 'departments', 'schools', ['school_id'], ['id'])

    # 4. Add school_id to users
    op.add_column('users', sa.Column('scope_school_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_scope_school_id', 'users', 'schools', ['scope_school_id'], ['id'])

    # 5. Add path and stream to sections
    op.add_column('sections', sa.Column('path', sa.String(), nullable=True))
    op.add_column('sections', sa.Column('stream', sa.String(), nullable=True))

    # Update existing sections with path
    op.execute("""
        UPDATE sections
        SET path = '/1/1/' || CAST(department_id AS TEXT) || '/' || CAST(id AS TEXT)
    """)

    # 6. Convert year from String to Integer (II->2, III->3, IV->4)
    # First add a temp column
    op.add_column('sections', sa.Column('year_int', sa.Integer(), nullable=True))
    op.execute("""
        UPDATE sections
        SET year_int = CASE
            WHEN year = 'II' THEN 2
            WHEN year = 'III' THEN 3
            WHEN year = 'IV' THEN 4
            WHEN year = 'I' THEN 1
            ELSE 2
        END
    """)
    op.drop_column('sections', 'year')
    op.alter_column('sections', 'year_int', new_column_name='year', nullable=False)

    # 7. Create session_status enum type (for PostgreSQL) or use string check
    # Using string with check constraint for SQLite compatibility
    op.add_column('attendance_records',
        sa.Column('status', sa.String(), nullable=True, server_default='pending'))
    op.add_column('attendance_records',
        sa.Column('strength_snapshot', sa.Integer(), nullable=True))
    op.add_column('attendance_records',
        sa.Column('no_session_reason', sa.String(), nullable=True))

    # Make absent_count nullable (only required for recorded status)
    # Update existing records to have status='recorded' and copy strength
    op.execute("""
        UPDATE attendance_records
        SET status = 'recorded',
            strength_snapshot = (
                SELECT strength FROM sections WHERE sections.id = attendance_records.section_id
            )
    """)

    # Now make strength_snapshot and status non-nullable
    op.alter_column('attendance_records', 'status', nullable=False)
    op.alter_column('attendance_records', 'strength_snapshot', nullable=False)
    op.alter_column('attendance_records', 'absent_count', nullable=True)


def downgrade() -> None:
    # Remove new columns from attendance_records
    op.drop_column('attendance_records', 'no_session_reason')
    op.drop_column('attendance_records', 'strength_snapshot')
    op.drop_column('attendance_records', 'status')

    # Convert year back to string
    op.add_column('sections', sa.Column('year_str', sa.String(), nullable=True))
    op.execute("""
        UPDATE sections
        SET year_str = CASE
            WHEN year = 1 THEN 'I'
            WHEN year = 2 THEN 'II'
            WHEN year = 3 THEN 'III'
            WHEN year = 4 THEN 'IV'
            ELSE 'II'
        END
    """)
    op.drop_column('sections', 'year')
    op.alter_column('sections', 'year_str', new_column_name='year', nullable=False)

    # Remove stream and path from sections
    op.drop_column('sections', 'stream')
    op.drop_column('sections', 'path')

    # Remove school_id from users
    op.drop_constraint('fk_users_scope_school_id', 'users', type_='foreignkey')
    op.drop_column('users', 'scope_school_id')

    # Remove school_id and path from departments
    op.drop_constraint('fk_departments_school_id', 'departments', type_='foreignkey')
    op.drop_column('departments', 'path')
    op.drop_column('departments', 'school_id')

    # Drop schools table
    op.drop_index(op.f('ix_schools_id'), table_name='schools')
    op.drop_table('schools')
