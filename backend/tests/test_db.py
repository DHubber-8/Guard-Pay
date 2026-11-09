from decimal import Decimal
import os
from pathlib import Path
import subprocess
import sys

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Agreement, Approval, AuditLog, Base, Case, EvidenceItem, Offer, Order
from app.db.session import (
    LOCAL_SQLITE_FILE,
    normalize_database_url,
    resolve_database_url,
)
from app.config import Settings


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


def test_models_relationships_and_defaults(db: Session) -> None:
    order = Order(
        paypal_order_id="ORDER-1",
        amount=Decimal("25.00"),
        currency="USD",
        status="COMPLETED",
        buyer_reference="buyer-1",
        raw={"status": "COMPLETED"},
    )
    case = Case(
        mode="merchant",
        scenario="item_not_received",
        status="open",
        order=order,
        findings={"items": []},
        risk_level="low",
        evidence_status="partial",
        overall_assessment="Review evidence",
    )
    evidence = EvidenceItem(case=case, description="Tracking record", source="carrier")
    offer = Offer(case=case, type="refund", amount=Decimal("10.00"), status="proposed")
    agreement = Agreement(
        case=case, type="refund", amount=Decimal("10.00"), status="pending"
    )
    approval = Approval(
        case=case,
        action_type="refund",
        approver_id="human-1",
        ai_recommendation="Refund",
        decision="approve",
    )
    audit = AuditLog(case=case, actor="human-1", event="approval.created")
    db.add_all([order, case, evidence, offer, agreement, approval, audit])
    db.commit()

    assert case.order is order
    assert order.cases == [case]
    assert case.evidence_items == [evidence]
    assert case.offers == [offer]
    assert case.agreements == [agreement]
    assert case.approvals == [approval]
    assert case.audit_logs == [audit]
    assert evidence.verified is False


def test_approval_requires_approver(db: Session) -> None:
    approval = Approval(
        case_id=1,
        action_type="refund",
        approver_id=None,
        ai_recommendation="Refund",
        decision="approve",
    )
    db.add(approval)
    with pytest.raises(IntegrityError):
        db.commit()


def test_paypal_identifiers_are_unique_but_nullable_dispute_id(db: Session) -> None:
    first_order = Order(
        paypal_order_id="ORDER-UNIQUE",
        amount=Decimal("10.00"),
        currency="USD",
        status="COMPLETED",
        buyer_reference="buyer-1",
        raw={},
    )
    db.add(first_order)
    db.commit()

    duplicate_order = Order(
        paypal_order_id="ORDER-UNIQUE",
        amount=Decimal("11.00"),
        currency="USD",
        status="COMPLETED",
        buyer_reference="buyer-2",
        raw={},
    )
    db.add(duplicate_order)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    first_case = Case(
        mode="merchant",
        scenario="dispute",
        status="OPEN",
        paypal_dispute_id="DISPUTE-UNIQUE",
        findings={},
        risk_level="unknown",
        evidence_status="missing",
        overall_assessment="Pending",
    )
    db.add(first_case)
    db.commit()
    duplicate_case = Case(
        mode="merchant",
        scenario="dispute",
        status="OPEN",
        paypal_dispute_id="DISPUTE-UNIQUE",
        findings={},
        risk_level="unknown",
        evidence_status="missing",
        overall_assessment="Pending",
    )
    db.add(duplicate_case)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    db.add_all(
        [
            Case(
                mode="merchant",
                scenario="dispute",
                status="OPEN",
                findings={},
                risk_level="unknown",
                evidence_status="missing",
                overall_assessment="Pending",
            ),
            Case(
                mode="merchant",
                scenario="dispute",
                status="OPEN",
                findings={},
                risk_level="unknown",
                evidence_status="missing",
                overall_assessment="Pending",
            ),
        ]
    )
    db.commit()


def test_webhook_migration_applies_from_previous_head_on_sqlite(tmp_path: Path) -> None:
    database_url = f"sqlite:///{tmp_path / 'migration.sqlite'}"
    repository_root = Path(__file__).resolve().parents[2]
    script = (
        "import sys; "
        "from alembic.config import Config; "
        "from alembic import command; "
        f"sys.path.insert(0, {str(repository_root / 'backend')!r}); "
        "config = Config('backend/alembic.ini'); "
        f"config.set_main_option('script_location', {str(repository_root / 'backend' / 'alembic')!r}); "
        "command.upgrade(config, '20261110_0003'); "
        "command.upgrade(config, 'head')"
    )
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=repository_root,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr


def test_empty_database_url_uses_named_sqlite_fallback(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level("WARNING"):
        database_url = resolve_database_url(Settings(database_url="", env="local"))

    assert database_url == f"sqlite:///./{LOCAL_SQLITE_FILE}"
    assert LOCAL_SQLITE_FILE in caplog.text


def test_production_requires_database_url() -> None:
    with pytest.raises(RuntimeError, match="DATABASE_URL must be set"):
        resolve_database_url(Settings(database_url="", env="production"))


def test_normalize_postgres_url() -> None:
    assert (
        normalize_database_url("postgres://user:pass@localhost/db")
        == "postgresql+psycopg://user:pass@localhost/db"
    )


def test_normalize_postgresql_url() -> None:
    assert (
        normalize_database_url("postgresql://user:pass@localhost/db")
        == "postgresql+psycopg://user:pass@localhost/db"
    )


@pytest.mark.parametrize(
    "database_url",
    ["postgresql+psycopg://user:pass@localhost/db", "sqlite:///./dispute_helper.db"],
)
def test_normalize_other_database_urls_unchanged(database_url: str) -> None:
    assert normalize_database_url(database_url) == database_url
