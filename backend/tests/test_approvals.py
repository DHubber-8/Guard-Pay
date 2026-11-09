"""Tests for merchant approval and decline flows."""

from collections.abc import Generator
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import Agreement, Approval, AuditLog, Base, Case, Order
from app.db.session import get_db
from app.main import create_app
from app.paypal.refunds import RefundResult
from app.routes.approvals import refund_dependency


@pytest.fixture
def setup() -> Generator[tuple[TestClient, Session, int], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = Session(engine)
    order = Order(
        paypal_order_id="ORDER-1",
        amount=Decimal("40.00"),
        currency="USD",
        status="COMPLETED",
        buyer_reference="buyer",
        raw={"capture_ids": ["CAPTURE-1"]},
    )
    case = Case(
        mode="merchant",
        scenario="item_not_received",
        status="open",
        order=order,
        findings={"suggested_action": "Review the evidence"},
        risk_level="low",
        evidence_status="complete",
        overall_assessment="Review",
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    application = create_app(Settings(session_secret="test-session-secret"))
    application.dependency_overrides[get_db] = override_get_db
    with TestClient(application) as client:
        signup = client.post(
            "/auth/signup",
            headers={"X-Requested-With": "XMLHttpRequest"},
            json={
                "email": "merchant@example.test",
                "name": "Merchant",
                "role": "merchant",
                "password": "correct horse battery staple",
            },
        )
        assert signup.status_code == 200
        yield client, db, case.id
    db.close()
    Base.metadata.drop_all(engine)


def _payload(offer: str = "partial", amount: str | None = "15.00") -> dict[str, str]:
    payload = {"offer": offer, "message": "Please process this decision"}
    if amount is not None:
        payload["amount"] = amount
    return payload


def test_refund_is_called_after_approval_commit(
    setup: tuple[TestClient, Session, int],
) -> None:
    client, db, case_id = setup
    calls: list[str] = []

    async def fake_refund(*args: object, **kwargs: object) -> RefundResult:
        assert db.query(Approval).count() == 1
        assert db.query(AuditLog).filter(AuditLog.event == "approval.created").count() == 1
        calls.append(str(args[0]))
        return RefundResult(refund_id="REFUND-1", status="COMPLETED")

    client.app.dependency_overrides[refund_dependency] = lambda: fake_refund
    response = client.post(
        f"/cases/{case_id}/approve",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json=_payload(),
    )

    assert response.status_code == 200
    assert response.json()["refund_id"] == "REFUND-1"
    assert calls == ["CAPTURE-1"]
    assert db.query(Agreement).count() == 1


def test_second_approve_is_guarded_and_refunds_once(
    setup: tuple[TestClient, Session, int],
) -> None:
    client, _, case_id = setup
    calls = 0

    async def fake_refund(*args: object, **kwargs: object) -> RefundResult:
        nonlocal calls
        calls += 1
        return RefundResult(refund_id="REFUND-1")

    client.app.dependency_overrides[refund_dependency] = lambda: fake_refund
    headers = {"X-Requested-With": "XMLHttpRequest"}
    assert client.post(f"/cases/{case_id}/approve", headers=headers, json=_payload()).status_code == 200
    assert client.post(f"/cases/{case_id}/approve", headers=headers, json=_payload()).status_code == 409
    assert calls == 1


def test_amount_over_case_amount_is_rejected(
    setup: tuple[TestClient, Session, int],
) -> None:
    client, _, case_id = setup
    response = client.post(
        f"/cases/{case_id}/approve",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json=_payload(amount="40.01"),
    )

    assert response.status_code == 422


def test_missing_capture_id_is_handled(
    setup: tuple[TestClient, Session, int],
) -> None:
    client, db, case_id = setup
    db.query(Order).one().raw = {}
    db.commit()

    response = client.post(
        f"/cases/{case_id}/approve",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json=_payload(),
    )

    assert response.status_code == 409
    assert db.query(Case).one().status == "refund_failed"
    assert db.query(AuditLog).filter(AuditLog.event == "refund.failed").count() == 1


def test_refund_failure_leaves_audit_row(
    setup: tuple[TestClient, Session, int],
) -> None:
    client, db, case_id = setup

    async def fake_refund(*args: object, **kwargs: object) -> RefundResult:
        from app.paypal.refunds import RefundNotAllowedError

        raise RefundNotAllowedError("capture is not refundable")

    client.app.dependency_overrides[refund_dependency] = lambda: fake_refund
    response = client.post(
        f"/cases/{case_id}/approve",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json=_payload(),
    )

    assert response.status_code == 409
    assert db.query(Case).one().status == "refund_failed"
    assert db.query(AuditLog).filter(AuditLog.event == "refund.failed").count() == 1


def test_decline_never_calls_paypal(
    setup: tuple[TestClient, Session, int],
) -> None:
    client, db, case_id = setup
    response = client.post(
        f"/cases/{case_id}/decline",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json=_payload(offer="replace", amount=None),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "declined"
    assert db.query(Approval).one().decision == "decline"
    assert db.query(AuditLog).filter(AuditLog.event == "approval.declined").count() == 1


def test_unauthenticated_approval_returns_401() -> None:
    engine = create_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    application = create_app(Settings(session_secret="test-session-secret"))
    with TestClient(application) as client:
        response = client.post(
            "/cases/1/approve",
            headers={"X-Requested-With": "XMLHttpRequest"},
            json=_payload(),
        )
    Base.metadata.drop_all(engine)
    assert response.status_code == 401
