"""Tests for merchant case list and detail endpoints."""

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import Base, Case
from app.db.session import get_db
from app.main import create_app
from scripts.seed_demo import seed_demo


def _signup(client: TestClient) -> None:
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

    with Session(engine) as db:
        seed_demo(db)
        db.add(
            Case(
                mode="merchant",
                scenario="unclassified",
                status="open",
                findings={},
                risk_level="unknown",
                evidence_status="missing",
                overall_assessment="Pending",
            )
        )
        db.commit()
    application = create_app(Settings(session_secret="test-session-secret"))
    application.dependency_overrides[get_db] = override_get_db
    return TestClient(application), engine


def test_cases_require_login() -> None:
    client, engine = _client()
    try:
        assert client.get("/cases").status_code == 401
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_list_filters_and_paginates_seeded_cases() -> None:
    client, engine = _client()
    try:
        _signup(client)
        response = client.get("/cases?type=dispute&limit=1&offset=1")

        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["scenario"] == "item_not_as_described_damaged"
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_case_detail_includes_nested_data_and_oldest_first_timeline() -> None:
    client, engine = _client()
    try:
        _signup(client)
        response = client.get("/cases/1")

        assert response.status_code == 200
        body = response.json()
        assert body["order"]["paypal_order_id"] == "DEMO-DAMAGED-HAND-CREAM"
        assert len(body["evidence_items"]) == 5
        assert body["offers"] == []
        assert len(body["timeline"]) == 6
        assert body["timeline"][0]["text"].startswith("Order ")
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_empty_findings_are_returned_without_breaking_detail() -> None:
    client, engine = _client()
    try:
        _signup(client)
        response = client.get("/cases/3")

        assert response.status_code == 200
        assert response.json()["findings"] == {}
    finally:
        client.close()
        Base.metadata.drop_all(engine)


def test_unknown_case_is_404() -> None:
    client, engine = _client()
    try:
        _signup(client)
        response = client.get("/cases/999")

        assert response.status_code == 404
        assert response.json() == {"detail": "Case not found"}
    finally:
        client.close()
        Base.metadata.drop_all(engine)
