"""Tests for synthetic carrier, fixtures, and demo scripts.

Owner: Digant
Status: in progress
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Base, Case, EvidenceItem, Order
from app.main import create_app
from app.mocks.carrier import tracking_status
from app.config import Settings
from scripts.reset_demo import validate_reset_target
from scripts.seed_demo import FIXTURE_DIR, FIXTURE_NAMES, is_local_database_url, seed_demo


@pytest.mark.parametrize(
    ("tracking_number", "status", "event"),
    [
        ("DEMO-DELIVERED-1", "delivered", "Package delivered"),
        ("DEMO-IN_TRANSIT-1", "in_transit", "Package accepted"),
        ("DEMO-STUCK-7", "stuck", "No scan for 7 days"),
        ("DEMO-LOST-1", "lost", "Carrier investigation"),
    ],
)
def test_mock_carrier_patterns(
    tracking_number: str, status: str, event: str
) -> None:
    result = tracking_status(tracking_number)

    assert result.mock is True
    assert result.status == status
    assert event in result.last_event


def test_mock_carrier_endpoint_is_read_only() -> None:
    response = TestClient(create_app()).get("/mock-carrier/tracking/DEMO-STUCK-12")

    assert response.status_code == 200
    assert response.json()["mock"] is True
    assert response.json()["status"] == "stuck"


def test_seed_is_idempotent_and_preserves_verified_flags() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        assert seed_demo(db) == 2
        assert seed_demo(db) == 2
        assert db.query(Order).count() == 2
        assert db.query(Case).count() == 2
        assert db.query(EvidenceItem).count() == 9
        assert {item.source for item in db.query(EvidenceItem).all() if item.verified} == {
            "paypal",
            "carrier",
        }
        for name in FIXTURE_NAMES:
            fixture = json.loads((FIXTURE_DIR / name).read_text(encoding="utf-8"))
            assert all(
                item["verified"] == (item["source"] in {"paypal", "carrier"})
                for item in fixture["evidence"]
            )
    Base.metadata.drop_all(engine)


def test_fixtures_contain_required_scenario_details() -> None:
    fixture = json.loads(
        (FIXTURE_DIR / "damaged_hand_cream.json").read_text(
            encoding="utf-8"
        )
    )

    assert fixture["seller"] == "Glow Haven Beauty"
    assert fixture["item"] == "Velvet Repair Hand Cream, 2 L Salon Pump Refill"
    assert fixture["amount"] == "25.00"
    assert fixture["delivery_day"] == 4
    assert fixture["reported_hours_after_delivery"] == 3
    assert len(fixture["buyer_chat"]) == 6
    assert len(fixture["photo_descriptions"]) == 4


def test_reset_refuses_production_and_remote_targets() -> None:
    with pytest.raises(RuntimeError, match="production"):
        validate_reset_target(Settings(env="production", database_url="sqlite:///demo.db"))
    with pytest.raises(RuntimeError, match="non-local"):
        validate_reset_target(
            Settings(
                env="local",
                database_url=(
                    "postgresql://user:pass@dpg-xxxx.oregon-postgres.render.com/demo"
                ),
            )
        )


def test_compose_database_hostname_is_local() -> None:
    assert is_local_database_url("postgresql://user:pass@db:5432/demo")
