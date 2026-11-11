"""Add developer diagnostic logs.

Revision ID: 20261110_0005
Revises: 20261110_0004
"""

from alembic import op
import sqlalchemy as sa

revision = "20261110_0005"
down_revision = "20261110_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dev_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("request_id", sa.String(length=32), nullable=True),
        sa.Column("method", sa.String(length=16), nullable=True),
        sa.Column("path", sa.String(length=512), nullable=True),
        sa.Column("status", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Numeric(12, 3), nullable=True),
        sa.Column("level", sa.String(length=16), nullable=False, server_default="INFO"),
        sa.Column("message", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("meta", sa.JSON(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_dev_logs_ts", "dev_logs", ["ts"])
    op.create_index("ix_dev_logs_kind", "dev_logs", ["kind"])
    op.create_index("ix_dev_logs_request_id", "dev_logs", ["request_id"])


def downgrade() -> None:
    op.drop_index("ix_dev_logs_request_id", table_name="dev_logs")
    op.drop_index("ix_dev_logs_kind", table_name="dev_logs")
    op.drop_index("ix_dev_logs_ts", table_name="dev_logs")
    op.drop_table("dev_logs")
