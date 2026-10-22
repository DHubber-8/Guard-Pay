"""Health endpoint test."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app, create_app


def test_health() -> None:
    # TODO: Expand API smoke coverage as routes become implemented.
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_allowed_origin_gets_cors_header() -> None:
    client = TestClient(
        create_app(
            Settings(frontend_origin="http://localhost:5173,https://frontend.example")
        )
    )

    response = client.get("/health", headers={"Origin": "https://frontend.example"})

    assert response.headers["access-control-allow-origin"] == "https://frontend.example"


def test_disallowed_origin_does_not_get_cors_header() -> None:
    client = TestClient(create_app(Settings(frontend_origin="https://frontend.example")))

    response = client.get("/health", headers={"Origin": "https://other.example"})

    assert "access-control-allow-origin" not in response.headers


def test_allowed_origin_preflight_succeeds() -> None:
    client = TestClient(create_app(Settings(frontend_origin="https://frontend.example")))

    response = client.options(
        "/health",
        headers={
            "Origin": "https://frontend.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://frontend.example"


def test_frontend_origins_parse_spaces_and_trailing_slashes() -> None:
    config = Settings(
        frontend_origin=" http://localhost:5173/ , https://frontend.example///, "
    )

    assert config.frontend_origins == [
        "http://localhost:5173",
        "https://frontend.example",
    ]
