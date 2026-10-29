"""database trigger and booking procedure

Revision ID: a1b2c3d4e5f6
Revises: c4c787c8c70a
Create Date: 2026-10-29 15:05:00.000000

"""
from alembic import op

from app.db_objects import (
    CREATE_PROCEDURE_SQL,
    CREATE_TRIGGER_SQL,
    DROP_PROCEDURE_SQL,
    DROP_TRIGGER_SQL,
)

revision = "a1b2c3d4e5f6"
down_revision = "c4c787c8c70a"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(DROP_TRIGGER_SQL)
    op.execute(CREATE_TRIGGER_SQL)
    op.execute(DROP_PROCEDURE_SQL)
    op.execute(CREATE_PROCEDURE_SQL)


def downgrade():
    op.execute(DROP_TRIGGER_SQL)
    op.execute(DROP_PROCEDURE_SQL)
