"""Tests for credential-free simulated PayPal behavior."""

from collections.abc import Generator

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings, settings
from app.db.models import Approval, AuditLog, Base, Case, Order
from app.db.session import get_db
from app.main import create_app
from app.paypal.client import PayPalClient
from app.paypal.disputes import get_dispute, list_disputes
from app.paypal.orders import get_order
from app.paypal.refunds import refund_capture


@pytest.mark.anyio
async def test_demo_reads_and_refund_make_no_http_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(500)

    monkeypatch.setattr(settings, "demo_mode", True)
    client = PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )
    order = await get_order("DEMO-DAMAGED-HAND-CREAM", client)
    dispute = await get_dispute("SIMULATED-DISPUTE-1", client)
    disputes = await list_disputes(client=client)
    refund = await refund_capture(
        "CAPTURE-1",
        "5.00",
        "USD",
        approver_id="1",
        case_id="2",
        client=client,
    )
    await client.aclose()

    assert calls == 0
    assert order.simulated is True
    assert dispute.simulated is True
    assert disputes[0].simulated is True
    assert refund.refund_id.startswith("SIMULATED-")
    assert refund.simulated is True


def test_demo_mode_is_refused_with_production_credentials() -> None:
    with pytest.raises(RuntimeError, match="DEMO_MODE"):
        create_app(
            Settings(
                env="production",
                session_secret="session",
                demo_mode=True,
                paypal_client_id="real-client-id",
            )
        )


@pytest.fixture
def demo_client() -> Generator[tuple[TestClient, Session], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = Session(engine)
    order = Order(
        paypal_order_id="DEMO-DAMAGED-HAND-CREAM",
        amount="25.00",
        currency="USD",
        status="COMPLETED",
        buyer_reference="demo-buyer@example.test",
        raw={"capture_ids": ["CAPTURE-1"]},
    )
    case = Case(
        mode="merchant",
        scenario="demo",
        status="open",
        order=order,
        findings={},
        risk_level="low",
        evidence_status="complete",
        overall_assessment="demo",
    )
    db.add(case)
    db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    application = create_app(
        Settings(
            session_secret="test-secret",
            demo_mode=True,
        )
    )
    application.dependency_overrides[get_db] = override_get_db
    with TestClient(application) as client:
        yield client, db
    db.close()
    Base.metadata.drop_all(engine)


def test_demo_approval_returns_simulated_refund_and_audit(
    demo_client: tuple[TestClient, Session],
) -> None:
    client, db = demo_client
    signup = client.post(
        "/auth/signup",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={
            "email": "demo-merchant@example.test",
            "name": "Demo Merchant",
            "role": "merchant",
            "password": "correct horse battery staple",
        },
    )
    assert signup.status_code == 200
    case_id = db.query(Case).one().id
    response = client.post(
        f"/cases/{case_id}/approve",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={"offer": "partial", "amount": "5.00", "message": "Demo approval"},
    )

    assert response.status_code == 200
    assert response.json()["simulated"] is True
    assert response.json()["refund_id"].startswith("SIMULATED-")
    assert db.query(Approval).count() == 1
    refund_audit = db.query(AuditLog).filter(AuditLog.event == "refund.sent").one()
    assert refund_audit.details["simulated"] is True
