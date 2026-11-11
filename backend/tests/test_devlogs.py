"""Developer log storage, redaction, and protected API tests."""

from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import devlogs
from app.config import Settings
from app.db.models import Base, DevLog
from app.db.session import get_db
from app.main import create_app
from app.paypal.client import PayPalClient


@pytest.fixture
def log_store(monkeypatch: pytest.MonkeyPatch) -> tuple[sessionmaker[Session], Settings]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    config = Settings(
        session_secret="test-session-secret",
        admin_token="admin-secret",
        dev_logs_enabled=True,
        dev_logs_max_rows=3,
    )
    monkeypatch.setattr(devlogs, "_session_factory", factory)
    devlogs.configure(config)
    devlogs._last_prune = 0
    yield factory, config
    Base.metadata.drop_all(engine)


def test_redaction_and_record_never_raises(log_store: tuple[sessionmaker[Session], Settings]) -> None:
    factory, _ = log_store
    devlogs.record(
        "app",
        message="email a.person@example.test password=hunter2 token=123456789",
        meta={"Authorization": "Bearer secret", "nested": {"password": "secret"}},
    )
    row = factory().scalar(select(DevLog))
    assert row is not None
    assert "example.test" not in row.message
    assert "123456789" not in row.message
    assert "secret" not in str(row.meta)


def test_record_disabled_and_db_failure_are_silent(monkeypatch: pytest.MonkeyPatch) -> None:
    config = Settings(dev_logs_enabled=False)
    devlogs.configure(config)
    devlogs.record("app", message="ignored")
    monkeypatch.setattr(devlogs, "_config", Settings(dev_logs_enabled=True))
    monkeypatch.setattr(devlogs, "_session_factory", lambda: (_ for _ in ()).throw(RuntimeError("db down")))
    devlogs.record("app", message="ignored")


def test_pruning_removes_oldest_rows(log_store: tuple[sessionmaker[Session], Settings]) -> None:
    factory, config = log_store
    db = factory()
    db.add_all(
        [
            DevLog(ts=datetime.now(timezone.utc) - timedelta(hours=25), kind="app", message="old"),
            DevLog(ts=datetime.now(timezone.utc), kind="app", message="one"),
            DevLog(ts=datetime.now(timezone.utc), kind="app", message="two"),
            DevLog(ts=datetime.now(timezone.utc), kind="app", message="three"),
        ]
    )
    db.commit()
    db.close()
    devlogs._last_prune = 0
    devlogs.record("app", message="new")
    rows = factory().scalars(select(DevLog).order_by(DevLog.id)).all()
    assert len(rows) == config.dev_logs_max_rows
    assert all(row.message != "old" for row in rows)


def test_request_middleware_and_health_skip(log_store: tuple[sessionmaker[Session], Settings]) -> None:
    _, config = log_store
    application = create_app(config)
    with TestClient(application) as client:
        response = client.get("/mock-carrier/tracking/DELIVERED-72H")
        assert response.headers["X-Request-Id"]
        assert client.get("/health").status_code == 200
    rows = log_store[0]().scalars(select(DevLog).order_by(DevLog.id)).all()
    assert len([row for row in rows if row.kind == "request" and row.path == "/mock-carrier/tracking/DELIVERED-72H"]) == 1
    assert not any(row.path == "/health" for row in rows)


def test_dev_routes_require_admin_token_and_support_since_id(
    log_store: tuple[sessionmaker[Session], Settings],
) -> None:
    factory, config = log_store
    application = create_app(config)

    def override_db() -> Generator[Session, None, None]:
        with factory() as db:
            yield db

    application.dependency_overrides[get_db] = override_db
    devlogs.record("app", message="first")
    devlogs.record("app", message="second")
    with TestClient(application) as client:
        assert client.get("/dev/logs").status_code == 403
        response = client.get("/dev/logs", headers={"X-Admin-Token": config.admin_token})
        assert response.status_code == 200
        body = response.json()
        assert len(body["rows"]) >= 2
        first_id = body["rows"][0]["id"]
        polled = client.get(
            f"/dev/logs?since_id={first_id}",
            headers={"X-Admin-Token": config.admin_token},
        )
        assert all(row["id"] > first_id for row in polled.json()["rows"])
        page = client.get("/dev", headers={"X-Admin-Token": config.admin_token})
        assert page.status_code == 200
        assert page.headers["Content-Security-Policy"]


def test_disabled_dev_routes_are_not_found() -> None:
    config = Settings(dev_logs_enabled=False, admin_token="admin-secret")
    application = create_app(config)
    with TestClient(application) as client:
        assert client.get("/dev").status_code == 404
        assert client.get("/dev/logs").status_code == 404


@pytest.mark.anyio
async def test_paypal_call_records_debug_id_without_token(
    log_store: tuple[sessionmaker[Session], Settings],
) -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "do-not-log", "expires_in": 3600})
        return httpx.Response(200, headers={"PayPal-Debug-Id": "debug-1"}, json={"ok": True})

    client = PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )
    await client.request("GET", "/v1/test")
    await client.aclose()
    rows = log_store[0]().scalars(select(DevLog).where(DevLog.kind == "paypal_out")).all()
    assert any(row.meta.get("paypal_debug_id") == "debug-1" for row in rows)
    assert "do-not-log" not in str(rows)
