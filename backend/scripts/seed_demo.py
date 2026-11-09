"""Seed synthetic fixture data into the local database only.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.auth import hash_password
from app.db.models import Base, Case, EvidenceItem, Order, Shipment, User

FIXTURE_DIR = BACKEND_DIR / "app" / "fixtures"
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
            raw={**fixture, "seed": True},
        )
        db.add(order)
        db.flush()
    elif isinstance(order.raw, dict):
        order.raw = {**order.raw, "seed": True}

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
                "seed": True,
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
    else:
        case.findings = {**(case.findings or {}), "seed": True}

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


def seed_shipments(db: Session, orders: list[Order]) -> None:
    """Create deterministic shipment examples for the synthetic orders."""
    now = datetime.now(timezone.utc)
    examples = [
        (orders[0], "DEMO-IN_TRANSIT-1", "on_time"),
        (orders[1], "DEMO-STUCK-7", "on_time"),
        (orders[0], "DEMO-DELIVERED-3H", "delivered"),
    ]
    for order, tracking_number, status in examples:
        existing = (
            db.query(Shipment)
            .filter(
                Shipment.order_id == order.id,
                Shipment.tracking_number == tracking_number,
            )
            .one_or_none()
        )
        if existing is not None:
            continue
        shipped_at = now - timedelta(days=2)
        db.add(
            Shipment(
                order=order,
                carrier=order.carrier or "DEMO_CARRIER",
                tracking_number=tracking_number,
                shipped_at=shipped_at,
                expected_at=now + timedelta(days=1),
                delivered_at=now - timedelta(hours=3) if status == "delivered" else None,
                status=status,
            )
        )


def clear_seeded_demo(db: Session) -> None:
    """Remove only synthetic seeded cases and orders, preserving audit data."""
    seeded_orders = [
        order
        for order in db.query(Order).all()
        if (order.raw or {}).get("seed") is True
    ]
    for order in seeded_orders:
        for shipment in list(order.shipments):
            db.delete(shipment)
    seeded_cases = (
        db.query(Case)
        .filter(Case.paypal_dispute_id.is_(None))
        .all()
    )
    for case in seeded_cases:
        if (case.findings or {}).get("seed") is not True:
            continue
        if case.approvals or case.audit_logs:
            continue
        db.delete(case)
    db.flush()
    for order in seeded_orders:
        if not (order.raw or {}).get("seed") is True:
            continue
        if order.cases:
            continue
        db.delete(order)


def seed_demo_user(db: Session, email: str, name: str, role: str, password: str) -> User:
    """Create one synthetic demo user when its password was explicitly supplied."""
    user = db.query(User).filter(User.email == email).one_or_none()
    if user is None:
        user = User(
            email=email,
            name=name,
            role=role,
            password_hash=hash_password(password),
        )
        db.add(user)
    return user


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
        seeded_orders: list[Order] = []
        for name in FIXTURE_NAMES:
            case = seed_fixture(db, load_fixture(FIXTURE_DIR / name))
            if case.order is not None:
                seeded_orders.append(case.order)
        seed_shipments(db, seeded_orders)
        if config.demo_merchant_password:
            seed_demo_user(
                db,
                "demo-merchant@example.test",
                "Synthetic Merchant",
                "merchant",
                config.demo_merchant_password,
            )
        if config.demo_individual_password:
            seed_demo_user(
                db,
                "demo-individual@example.test",
                "Synthetic Individual",
                "individual",
                config.demo_individual_password,
            )
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
