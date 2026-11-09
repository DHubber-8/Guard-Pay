"""Tests for demo reset and readiness endpoints."""

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import AuditLog, Base, Case, Order
from app.db.session import get_db
from app.main import create_app
from scripts.seed_demo import seed_demo


def _app(config: Settings) -> tuple[TestClient, Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = Session(engine)

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    application = create_app(config)
    application.dependency_overrides[get_db] = override_get_db
    return TestClient(application), db


def test_reseed_removes_only_seeded_rows_and_restores_them() -> None:
    client, db = _app(Settings(admin_token="admin-secret"))
    try:
        seed_demo(db)
        real_order = Order(
            paypal_order_id="REAL-ORDER",
            amount=10,
            currency="USD",
            status="COMPLETED",
            buyer_reference="real@example.test",
            raw={},
        )
        real_case = Case(
            mode="merchant",
            scenario="unclassified",
            status="open",
            paypal_dispute_id="PP-REAL-1",
            findings={},
            risk_level="low",
            evidence_status="complete",
            overall_assessment="Real webhook case",
            order=real_order,
        )
        db.add(real_case)
        db.add(AuditLog(case=real_case, actor="paypal", event="webhook", details={}))
        db.commit()
        real_id = real_case.id

        response = client.post(
            "/admin/reseed-demo",
            headers={
                "X-Admin-Token": "admin-secret",
                "X-Requested-With": "XMLHttpRequest",
            },
        )

        assert response.status_code == 200
        assert db.query(Case).filter(Case.paypal_dispute_id == "PP-REAL-1").one().id == real_id
        assert db.query(Case).filter(Case.findings["seed"].as_boolean() == True).count() == 2
        assert db.query(Order).filter(Order.raw["seed"].as_boolean() == True).count() == 2
        assert db.query(AuditLog).filter(AuditLog.event == "webhook").count() == 1
    finally:
        client.close()
        db.close()


def test_reseed_requires_configured_and_correct_token() -> None:
    client, db = _app(Settings())
    try:
        assert (
            client.post(
                "/admin/reseed-demo",
                headers={"X-Admin-Token": "wrong", "X-Requested-With": "XMLHttpRequest"},
            ).status_code
            == 404
        )
    finally:
        client.close()
        db.close()

    client, db = _app(Settings(admin_token="admin-secret"))
    try:
        response = client.post(
            "/admin/reseed-demo",
            headers={"X-Admin-Token": "wrong", "X-Requested-With": "XMLHttpRequest"},
        )
        assert response.status_code == 403
    finally:
        client.close()
        db.close()


def test_readiness_ok_and_database_failure() -> None:
    client, db = _app(Settings())
    try:
        assert client.get("/health").json() == {"status": "ok"}
        assert client.get("/health/ready").json() == {"status": "ready"}
    finally:
        client.close()
        db.close()

    client, db = _app(Settings())

    def broken_get_db() -> Generator[object, None, None]:
        class BrokenSession:
            def execute(self, statement: object) -> None:
                raise SQLAlchemyError("database unavailable")

        yield BrokenSession()

    client.app.dependency_overrides[get_db] = broken_get_db
    try:
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert response.json() == {"status": "unready"}
    finally:
        client.close()
        db.close()
