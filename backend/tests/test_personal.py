"""Tests for personal Scam Check routes and the keyword stub."""

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import AuditLog, Base, Case
from app.db.session import get_db
from app.main import create_app
from app.personal_stub import analyze_personal_check


def _client() -> tuple[TestClient, Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = Session(engine)

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    application = create_app(Settings(session_secret="test-session-secret"))
    application.dependency_overrides[get_db] = override_get_db
    return TestClient(application), db


def _signup(client: TestClient, email: str) -> None:
    response = client.post(
        "/auth/signup",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={
            "email": email,
            "name": email.split("@")[0],
            "role": "individual",
            "password": "correct horse battery staple",
        },
    )
    assert response.status_code == 200


def _create(client: TestClient) -> int:
    response = client.post(
        "/personal/checks",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={
            "description": "A message asks for my password urgently",
            "link_or_sender": "sender@example.test",
            "screenshots": ["screenshot-1"],
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_personal_routes_require_login() -> None:
    client, db = _client()
    try:
        assert client.get("/personal/checks").status_code == 401
    finally:
        client.close()
        db.close()


def test_answers_are_limited_to_two_rounds() -> None:
    client, db = _client()
    try:
        _signup(client, "one@example.test")
        case_id = _create(client)
        headers = {"X-Requested-With": "XMLHttpRequest"}
        for answer in ("No, I did not share anything.", "I received it by email."):
            response = client.post(
                f"/personal/checks/{case_id}/answers",
                headers=headers,
                json={"answers": [answer]},
            )
            assert response.status_code == 200
            assert response.json()["risk"] in {"low", "medium", "high", "inconclusive"}
        third = client.post(
            f"/personal/checks/{case_id}/answers",
            headers=headers,
            json={"answers": ["A third answer"]},
        )
        assert third.status_code == 409
    finally:
        client.close()
        db.close()


def test_history_is_isolated_between_users() -> None:
    client, db = _client()
    try:
        _signup(client, "one@example.test")
        first_id = _create(client)
        client.post(
            f"/personal/checks/{first_id}/decision",
            headers={"X-Requested-With": "XMLHttpRequest"},
            json={"decision": "monitor"},
        )
        client.post("/auth/logout", headers={"X-Requested-With": "XMLHttpRequest"})
        _signup(client, "two@example.test")
        second_id = _create(client)

        history = client.get("/personal/checks")

        assert history.status_code == 200
        assert [item["id"] for item in history.json()] == [second_id]
        assert history.json()[0]["decision"] is None
    finally:
        client.close()
        db.close()


def test_stub_never_emits_forbidden_phrases_or_requests_secrets() -> None:
    findings = analyze_personal_check(
        "They demand my password and one-time code.",
        "urgent sender",
        [],
    )
    text = " ".join(findings.reasons + findings.safe_steps).casefold()

    assert "fraud confirmed" not in text
    assert "guaranteed" not in text
    assert any("never share" in step.casefold() for step in findings.safe_steps)


def test_decision_is_stored_and_case_is_updated() -> None:
    client, db = _client()
    try:
        _signup(client, "one@example.test")
        case_id = _create(client)
        response = client.post(
            f"/personal/checks/{case_id}/decision",
            headers={"X-Requested-With": "XMLHttpRequest"},
            json={"decision": "report"},
        )

        assert response.status_code == 200
        assert db.query(Case).one().status == "report"
        audit = db.query(AuditLog).filter(AuditLog.event == "personal_decision").one()
        assert audit.details["decision"] == "report"
    finally:
        client.close()
        db.close()
