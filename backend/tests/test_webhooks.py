"""PayPal webhook route tests.

Owner: Digant
Status: in progress
"""

from collections.abc import Iterator
import json

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import AuditLog, Base, Case
from app.db.session import get_db
from app.main import create_app
from app.paypal.client import PayPalClient
from app.routes import webhooks


@pytest.fixture
def db() -> Iterator[Session]:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


@pytest.fixture
def client(db: Session, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    application = create_app()
    application.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr(settings, "paypal_webhook_id", "webhook-1")
    yield TestClient(application)
    application.dependency_overrides.clear()


def _event(event_id: str = "event-1", event_type: str = "CUSTOMER.DISPUTE.CREATED") -> dict:
    return {
        "id": event_id,
        "event_type": event_type,
        "resource": {"dispute_id": "dispute-1", "status": "OPEN"},
    }


def _headers() -> dict[str, str]:
    return {
        "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        "PAYPAL-CERT-URL": "https://api-m.sandbox.paypal.com/cert",
        "PAYPAL-TRANSMISSION-ID": "transmission-1",
        "PAYPAL-TRANSMISSION-SIG": "signature-1",
        "PAYPAL-TRANSMISSION-TIME": "2026-01-01T00:00:00Z",
    }


def _mock_paypal(monkeypatch: pytest.MonkeyPatch, verification_status: str) -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "test-token", "expires_in": 3600})
        assert request.method == "POST"
        assert request.url.path == "/v1/notifications/verify-webhook-signature"
        payload = json.loads(request.content)
        assert payload["webhook_id"] == "webhook-1"
        return httpx.Response(200, json={"verification_status": verification_status})

    def client_factory() -> PayPalClient:
        return PayPalClient(
            base_url="https://sandbox.test",
            client_id="test-client",
            client_secret="test-secret",
            transport=httpx.MockTransport(handler),
        )

    monkeypatch.setattr(webhooks, "PayPalClient", client_factory)


def test_valid_signature_creates_case_and_audit(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_paypal(monkeypatch, "SUCCESS")

    response = client.post("/webhooks/paypal", headers=_headers(), json=_event())

    assert response.status_code == 200
    case = db.query(Case).one()
    assert case.paypal_dispute_id == "dispute-1"
    assert case.mode == "merchant"
    assert case.scenario == "unclassified"
    audit = db.query(AuditLog).one()
    assert audit.details["resource"]["dispute_id"] == "dispute-1"


def test_duplicate_event_is_noop(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_paypal(monkeypatch, "SUCCESS")

    assert client.post("/webhooks/paypal", headers=_headers(), json=_event()).status_code == 200
    assert client.post("/webhooks/paypal", headers=_headers(), json=_event()).status_code == 200

    assert db.query(Case).count() == 1
    assert db.query(AuditLog).count() == 1


def test_failed_verification_writes_nothing(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_paypal(monkeypatch, "FAILURE")

    response = client.post("/webhooks/paypal", headers=_headers(), json=_event())

    assert response.status_code == 400
    assert db.query(Case).count() == 0
    assert db.query(AuditLog).count() == 0


def test_empty_webhook_id_refuses_event(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "paypal_webhook_id", "")

    response = client.post("/webhooks/paypal", headers=_headers(), json=_event())

    assert response.status_code == 400
    assert db.query(Case).count() == 0
    assert db.query(AuditLog).count() == 0


def test_unknown_event_type_returns_200_and_audits(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    _mock_paypal(monkeypatch, "SUCCESS")

    response = client.post(
        "/webhooks/paypal",
        headers=_headers(),
        json=_event(event_type="PAYMENT.CAPTURE.COMPLETED"),
    )

    assert response.status_code == 200
    assert db.query(Case).count() == 0
    audit = db.query(AuditLog).one()
    assert audit.event == "PAYMENT.CAPTURE.COMPLETED"
