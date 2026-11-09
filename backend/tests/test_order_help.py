"""Tests for buyer order-help routes."""

from collections.abc import Generator
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import AuditLog, Base, Case, EvidenceItem, Offer, Order
from app.db.session import get_db
from app.main import create_app
from app.routes import order_help


def _setup() -> tuple[TestClient, Session, int]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = Session(engine)
    order = Order(
        paypal_order_id="PAYPAL-1",
        amount=Decimal("40.00"),
        currency="USD",
        status="COMPLETED",
        buyer_reference="Buyer@Example.test",
        tracking_number="DEMO-STUCK-3",
        carrier="demo",
        raw={"order_number": "ORDER-1"},
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    application = create_app(Settings(carrier_api_base_url=""))
    application.dependency_overrides[get_db] = override_get_db
    return TestClient(application), db, order.id


def _headers() -> dict[str, str]:
    return {"X-Requested-With": "XMLHttpRequest"}


def _lookup(client: TestClient, email: str = "buyer@example.test"):
    return client.post(
        "/order-help/lookup",
        headers=_headers(),
        json={"order_number": "ORDER-1", "email": email},
    )


def _request(client: TestClient, reason: str, **extra: object):
    payload = {
        "order_number": "ORDER-1",
        "email": "buyer@example.test",
        "reason": reason,
    }
    payload.update(extra)
    return client.post("/order-help", headers=_headers(), json=payload)


def test_lookup_matches_and_mismatches_have_same_404() -> None:
    client, db, _ = _setup()
    try:
        match = _lookup(client)
        wrong_number = client.post(
            "/order-help/lookup",
            headers=_headers(),
            json={"order_number": "WRONG", "email": "buyer@example.test"},
        )
        wrong_email = _lookup(client, "other@example.test")

        assert match.status_code == 200
        assert match.json()["tracking_steps"][0]["status"] == "stuck"
        assert wrong_number.status_code == wrong_email.status_code == 404
        assert wrong_number.json() == wrong_email.json() == {
            "detail": "We couldn't find that order"
        }
    finally:
        client.close()
        db.close()


def test_instant_answer_and_sent_to_seller() -> None:
    client, db, _ = _setup()
    try:
        answer = _request(
            client, "not_arrived", not_arrived_reason="stuck", note="Still waiting"
        )
        sent = _request(client, "not_arrived", not_arrived_reason="delivered")

        assert answer.status_code == 200
        assert answer.json()["type"] == "answer"
        assert answer.json()["explanation"].startswith("Automated update:")
        assert sent.status_code == 200
        assert sent.json()["type"] == "sent_to_seller"
        assert "reply_due" in sent.json()
    finally:
        client.close()
        db.close()


def test_photos_are_unverified_and_message_is_audit_log() -> None:
    client, db, _ = _setup()
    try:
        response = _request(
            client,
            "damaged",
            note="The package is damaged",
            photos=["cracked box", "wet label"],
        )
        case = db.query(Case).one()

        assert response.status_code == 200
        assert db.query(EvidenceItem).count() == 2
        assert all(not item.verified for item in db.query(EvidenceItem).all())
        assert db.query(AuditLog).filter(AuditLog.event == "buyer_message").count() == 1
        assert case.scenario == "order_help_damaged"
    finally:
        client.close()
        db.close()


def test_accept_and_decline_change_only_offer_and_case_status() -> None:
    client, db, _ = _setup()
    try:
        _request(client, "cancel")
        case = db.query(Case).one()
        db.add(
            Offer(
                case=case,
                type="partial",
                amount=Decimal("15.00"),
                status="proposed",
                details={},
            )
        )
        db.commit()

        accepted = client.post(f"/order-help/{case.id}/accept", headers=_headers())
        assert accepted.status_code == 200
        assert db.query(Offer).one().status == "accepted"
        assert db.query(Case).one().status == "resolved"

        _request(client, "other")
        second_case = db.query(Case).order_by(Case.id.desc()).first()
        db.add(
            Offer(
                case=second_case,
                type="partial",
                amount=Decimal("10.00"),
                status="proposed",
                details={},
            )
        )
        db.commit()
        declined = client.post(
            f"/order-help/{second_case.id}/decline", headers=_headers()
        )
        assert declined.status_code == 200
        assert db.query(Offer).filter(Offer.case_id == second_case.id).one().status == "declined"
        assert db.query(Case).filter(Case.id == second_case.id).one().status == "waiting"
    finally:
        client.close()
        db.close()


def test_status_and_buyer_message() -> None:
    client, db, _ = _setup()
    try:
        _request(client, "other")
        case = db.query(Case).one()
        message = client.post(
            f"/order-help/{case.id}/message",
            headers=_headers(),
            json={"text": "Any update?"},
        )
        status = client.get(f"/order-help/{case.id}")

        assert message.status_code == 200
        assert status.status_code == 200
        assert status.json()["status"] == "waiting"
        assert db.query(AuditLog).filter(AuditLog.event == "buyer_message").count() == 2
    finally:
        client.close()
        db.close()


def test_rate_limit() -> None:
    client, db, _ = _setup()
    try:
        responses = [_lookup(client, f"wrong-{index}@example.test") for index in range(11)]
        assert responses[-1].status_code == 429
    finally:
        client.close()
        db.close()
