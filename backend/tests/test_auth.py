"""Authentication and authorization tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db.models import Base
from app.db.session import get_db
from app.main import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
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
        Settings(env="local", session_secret="test-session-secret")
    )
    application.dependency_overrides[get_db] = override_get_db
    with TestClient(application) as test_client:
        yield test_client
    Base.metadata.drop_all(engine)


def signup(client: TestClient, email: str, role: str) -> None:
    response = client.post(
        "/auth/signup",
        headers={"X-Requested-With": "XMLHttpRequest"},
        json={
            "email": email,
            "name": f"{role} user",
            "role": role,
            "password": "correct horse battery staple",
        },
    )
    assert response.status_code == 200


def test_signup_login_logout_and_me(client: TestClient) -> None:
    signup(client, "merchant@example.test", "merchant")
    assert client.get("/auth/me").json() == {"role": "merchant", "name": "merchant user"}

    client.post("/auth/logout", headers={"X-Requested-With": "XMLHttpRequest"})
    assert client.get("/auth/me").status_code == 401

    response = client.post(
        "/auth/login",
        json={"email": "merchant@example.test", "password": "correct horse battery staple"},
    )
    assert response.status_code == 200
    assert response.json() == {"role": "merchant", "name": "merchant user"}
    assert client.get("/auth/me").status_code == 200


def test_wrong_password_has_generic_error(client: TestClient) -> None:
    signup(client, "merchant@example.test", "merchant")
    response = client.post(
        "/auth/login",
        json={"email": "merchant@example.test", "password": "wrong password"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}

    response = client.post(
        "/auth/login",
        json={"email": "missing@example.test", "password": "wrong password"},
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


def test_protected_route_requires_cookie_and_role(client: TestClient) -> None:
    assert client.get("/cases").status_code == 401
    signup(client, "individual@example.test", "individual")
    assert client.get("/cases").status_code == 403


def test_csrf_header_is_required_for_mutating_requests(client: TestClient) -> None:
    response = client.post(
        "/auth/signup",
        json={
            "email": "merchant@example.test",
            "name": "Merchant",
            "role": "merchant",
            "password": "correct horse battery staple",
        },
    )

    assert response.status_code == 403


def test_production_requires_session_secret() -> None:
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        create_app(Settings(env="production", database_url="sqlite:///test.db"))
