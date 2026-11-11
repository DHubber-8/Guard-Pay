"""Tests for authenticated console summary endpoints."""

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import Base, Case
from app.db.session import get_db
from app.main import create_app


def _client() -> tuple[TestClient, object]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(engine) as db:
            yield db

    application = create_app(
        Settings(session_secret="test-session-secret", workers_enabled=True, workers_interval_seconds=120)
    )
    application.dependency_overrides[get_db] = override_get_db
    return TestClient(application), engine


def _login(client: TestClient) -> None:
    response = client.post(
        "/auth/signup",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={
            "email": "merchant@example.test",
            "name": "Merchant",
            "role": "merchant",
            "password": "correct horse battery staple",
        },
    )
    assert response.status_code == 200


def test_console_endpoints_require_authentication() -> None:
    client, engine = _client()
    try:
        assert client.get("/flags").status_code == 401
        assert client.get("/workers/status").status_code == 401
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_flags_and_worker_status_return_console_shapes() -> None:
    client, engine = _client()
    try:
        with Session(engine) as db:
            db.add(
                Case(
                    mode="merchant",
                    scenario="risk_review",
                    status="open",
                    findings={"risk_reasons": ["Repeated disputes"]},
                    risk_level="high",
                    evidence_status="missing",
                    overall_assessment="Review",
                )
            )
            db.commit()
        _login(client)
        flags = client.get("/flags")
        assert flags.status_code == 200
        assert flags.json()[0]["text"] == "Repeated disputes"
        status = client.get("/workers/status")
        assert status.status_code == 200
        assert status.json()["enabled"] is True
        assert status.json()["deadline"]["every"] == "Every 2 minutes"
    finally:
        client.close()
        Base.metadata.drop_all(engine)
