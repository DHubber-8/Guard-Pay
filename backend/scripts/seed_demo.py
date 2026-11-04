"""Seed synthetic fixture data into the local database only.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import json
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.models import Base, Case, EvidenceItem, Order

FIXTURE_DIR = BACKEND_DIR / "tests" / "fixtures"
FIXTURE_NAMES = ("damaged_hand_cream.json", "damaged_hand_cream_weak.json")


def load_fixture(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as fixture_file:
        data = json.load(fixture_file)
    if not isinstance(data, dict):
        raise ValueError(f"Fixture must contain a JSON object: {path}")
    return data


def seed_fixture(db: Session, fixture: dict[str, Any]) -> Case:
    """Insert one fixture, reusing existing rows when it was already seeded."""
    paypal_order_id = fixture["paypal_order_id"]
    order = db.query(Order).filter(Order.paypal_order_id == paypal_order_id).one_or_none()
    if order is None:
        order = Order(
            paypal_order_id=paypal_order_id,
            amount=Decimal(fixture["amount"]),
            currency=fixture["currency"],
            status="COMPLETED",
            buyer_reference=fixture["fixture_id"],
            tracking_number=fixture["tracking_number"],
            carrier=fixture["carrier"],
            raw=fixture,
        )
        db.add(order)
        db.flush()

    case = (
        db.query(Case)
        .filter(Case.order_id == order.id, Case.scenario == fixture["scenario"])
        .one_or_none()
    )
    if case is None:
        case = Case(
            mode="merchant",
            scenario=fixture["scenario"],
            status="open",
            order=order,
            findings={
                "fixture_id": fixture["fixture_id"],
                "seller": fixture["seller"],
                "item": fixture["item"],
                "delivery_day": fixture["delivery_day"],
                "reported_hours_after_delivery": fixture.get("reported_hours_after_delivery"),
                "reported_days_after_delivery": fixture.get("reported_days_after_delivery"),
                "buyer_chat": fixture["buyer_chat"],
                "seller_return_policy": fixture["seller_return_policy"],
                "photo_descriptions": fixture["photo_descriptions"],
            },
            risk_level="unknown",
            evidence_status="partial",
            overall_assessment="Synthetic demo case pending analysis",
        )
        db.add(case)
        db.flush()

    existing = {(item.description, item.source) for item in case.evidence_items}
    for evidence in fixture["evidence"]:
        key = (evidence["description"], evidence["source"])
        if key not in existing:
            db.add(
                EvidenceItem(
                    case=case,
                    description=evidence["description"],
                    source=evidence["source"],
                    verified=bool(evidence["verified"]),
                )
            )
    return case


def is_local_database_url(database_url: str) -> bool:
    if not database_url or database_url.startswith("sqlite"):
        return True
    return urlsplit(database_url).hostname in {"localhost", "127.0.0.1", "::1"}


def seed_demo(db: Session | None = None, config: Settings = settings) -> int:
    """Seed both synthetic scenario packs without making PayPal requests."""
    if db is None and (config.env.lower() == "production" or not is_local_database_url(config.database_url)):
        raise RuntimeError("Demo seed requires a non-production local database.")
    owned_session = db is None
    if db is None:
        from app.db.session import SessionLocal, engine

        Base.metadata.create_all(engine)
        db = SessionLocal()
    try:
        for name in FIXTURE_NAMES:
            seed_fixture(db, load_fixture(FIXTURE_DIR / name))
        db.commit()
        return db.query(Case).count()
    except Exception:
        db.rollback()
        raise
    finally:
        if owned_session:
            db.close()


if __name__ == "__main__":
    sys.path.insert(0, str(BACKEND_DIR))
    print(f"Seeded {seed_demo()} synthetic demo cases.")
