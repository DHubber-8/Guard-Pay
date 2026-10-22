from decimal import Decimal

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
