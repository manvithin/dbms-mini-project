"""administrator setup marker

Revision ID: d3f8a1b2c4e5
Revises: a1b2c3d4e5f6
Create Date: 2026-10-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d3f8a1b2c4e5"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "system_setting",
        sa.Column("setting_key", sa.String(length=64), nullable=False),
        sa.Column("setting_value", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("setting_key"),
    )
    # Keep setup closed on databases that already have an administrator.
    op.execute(
        "INSERT INTO system_setting (setting_key, setting_value) "
        "SELECT 'admin_setup_completed', 'migrated' FROM user_account "
        "WHERE role = 'admin' LIMIT 1"
    )


def downgrade():
    op.drop_table("system_setting")
