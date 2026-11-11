"""Add webhook idempotency and unique PayPal identifiers.

Revision ID: 20261110_0004
Revises: 20261110_0003
"""

import json

from alembic import op
import sqlalchemy as sa

revision = "20261110_0004"
down_revision = "20261110_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("audit_logs") as batch:
        batch.add_column(sa.Column("event_id", sa.String(length=128), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, details FROM audit_logs "
            "WHERE actor = :actor ORDER BY id"
        ),
        {"actor": "paypal"},
    )
    seen_event_ids: set[str] = set()
    for row in rows:
        details = row._mapping["details"]
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except json.JSONDecodeError:
                details = {}
        if not isinstance(details, dict):
            details = {}
        event_id = details.get("event_id")
        if not isinstance(event_id, str) or not event_id or event_id in seen_event_ids:
            continue
        seen_event_ids.add(event_id)
        connection.execute(
            sa.text("UPDATE audit_logs SET event_id = :event_id WHERE id = :id"),
            {"event_id": event_id, "id": row.id},
        )

    op.drop_index("ix_cases_paypal_dispute_id", table_name="cases")
    op.create_index(
        "ix_cases_paypal_dispute_id",
        "cases",
        ["paypal_dispute_id"],
        unique=True,
    )
    op.drop_index("ix_orders_paypal_order_id", table_name="orders")
    op.create_index(
        "ix_orders_paypal_order_id",
        "orders",
        ["paypal_order_id"],
        unique=True,
    )
    op.drop_index("ix_users_email", table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_audit_logs_event_id", "audit_logs", ["event_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_event_id", table_name="audit_logs")
    op.drop_index("ix_cases_paypal_dispute_id", table_name="cases")
    op.create_index(
        "ix_cases_paypal_dispute_id",
        "cases",
        ["paypal_dispute_id"],
        unique=False,
    )
    op.drop_index("ix_orders_paypal_order_id", table_name="orders")
    op.create_index(
        "ix_orders_paypal_order_id",
        "orders",
        ["paypal_order_id"],
        unique=False,
    )
    op.drop_index("ix_users_email", table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    with op.batch_alter_table("audit_logs") as batch:
        batch.drop_column("event_id")
