"""Tests for delivery monitoring and merchant shipment routes."""

from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import AuditLog, Base, Order, Shipment
from app.db.session import get_db
from app.main import create_app
from app.mocks.carrier import tracking_status
from app.workers.delivery_watch import map_status, run_once


@pytest.fixture
def database() -> Generator[tuple[object, Session], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        yield engine, db
    Base.metadata.drop_all(engine)


def _shipment(db: Session, tracking_number: str, status: str = "on_time") -> Shipment:
    order = Order(
        paypal_order_id=f"PAY-{tracking_number}",
        amount="20.00",
        currency="USD",
        status="COMPLETED",
        buyer_reference="buyer@example.test",
        carrier="DEMO_CARRIER",
        raw={"order_number": "1032"},
    )
    shipment = Shipment(
        order=order,
        carrier="DEMO_CARRIER",
        tracking_number=tracking_number,
        shipped_at=datetime.now(timezone.utc) - timedelta(days=1),
        expected_at=datetime.now(timezone.utc) + timedelta(days=1),
        status=status,
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


@pytest.mark.parametrize(
    ("tracking_number", "expected"),
    [
        ("DEMO-IN_TRANSIT-1", "on_time"),
        ("DEMO-STUCK-7", "delayed"),
        ("DEMO-LOST-1", "failed"),
        ("DEMO-DELIVERED-3H", "delivered"),
    ],
)
def test_carrier_status_mapping(
    database: tuple[object, Session], tracking_number: str, expected: str
) -> None:
    _, db = database
    shipment = _shipment(db, tracking_number)
    assert map_status(shipment, tracking_status(tracking_number).status, datetime.now(timezone.utc)) == expected


def test_delivered_at_override() -> None:
    result = tracking_status("DEMO-DELIVERED-3H", "2026-11-09T20:00:00+00:00")
    assert result.delivery_timestamp == "2026-11-09T20:00:00+00:00"


def test_worker_updates_and_is_idempotent(database: tuple[object, Session]) -> None:
    _, db = database
    shipment = _shipment(db, "DEMO-STUCK-7")

    assert run_once(db, Settings(carrier_api_base_url="")) == 1
    db.refresh(shipment)
    assert shipment.status == "delayed"
    assert db.query(AuditLog).count() == 1

    assert run_once(db, Settings(carrier_api_base_url="")) == 0
    assert db.query(AuditLog).count() == 1


def test_shipments_require_merchant_auth(database: tuple[object, Session]) -> None:
    engine, db = database
    _shipment(db, "DEMO-IN_TRANSIT-1")

    def override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as request_db:
            yield request_db

    application = create_app(Settings(session_secret="test-secret"))
    application.dependency_overrides[get_db] = override_get_db
    client = TestClient(application)
    assert client.get("/shipments").status_code == 401

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
    response = client.get("/shipments")
    assert response.status_code == 200
    assert response.json()[0]["status"] == "on_time"


def test_shipment_message_is_audit_only(database: tuple[object, Session]) -> None:
    engine, db = database
    shipment = _shipment(db, "DEMO-IN_TRANSIT-1")

    def override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as request_db:
            yield request_db

    application = create_app(Settings(session_secret="test-secret"))
    application.dependency_overrides[get_db] = override_get_db
    client = TestClient(application)
    client.post(
        "/auth/signup",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={
            "email": "merchant@example.test",
            "name": "Merchant",
            "role": "merchant",
            "password": "correct horse battery staple",
        },
    )
    response = client.post(
        f"/shipments/{shipment.order_id}/message",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={"text": "Your order is being reviewed."},
    )
    assert response.status_code == 200
    assert db.query(AuditLog).filter(AuditLog.event == "shipment_message").count() == 1
