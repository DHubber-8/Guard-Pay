"""Poll carrier tracking and maintain shipment delivery status."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from urllib.parse import quote
from urllib.request import urlopen

from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.models import AuditLog, Shipment
from app.db.session import SessionLocal
from app.mocks.carrier import MockTrackingResponse, tracking_status


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def fetch_tracking(shipment: Shipment, config: Settings = settings) -> MockTrackingResponse:
    """Fetch carrier data through the configured endpoint or local mock."""
    if not config.carrier_api_base_url:
        return tracking_status(shipment.tracking_number)
    base = config.carrier_api_base_url.rstrip("/")
    if not base.endswith("/mock-carrier"):
        base += "/mock-carrier"
    url = f"{base}/tracking/{quote(shipment.tracking_number, safe='')}"
    with urlopen(url, timeout=10) as response:
        data = json.load(response)
    return MockTrackingResponse.model_validate(data)


def map_status(shipment: Shipment, carrier_status: str, now: datetime) -> str:
    """Map carrier statuses to the shipment lifecycle used by the API."""
    normalized = carrier_status.lower()
    if normalized == "delivered":
        return "delivered"
    if normalized in {"lost", "failed"}:
        return "failed"
    if normalized in {"stuck", "delayed"}:
        return "delayed"
    expected_at = shipment.expected_at
    if expected_at.tzinfo is None:
        expected_at = expected_at.replace(tzinfo=timezone.utc)
    return "delayed" if now > expected_at else "on_time"


def _drafted_message(status: str, tracking_number: str) -> str:
    if status == "failed":
        return (
            f"Automated draft: carrier tracking for {tracking_number} indicates a "
            "delivery exception. Please review the shipment and contact the buyer."
        )
    return (
        f"Automated draft: carrier tracking for {tracking_number} is delayed. "
        "Please review the latest scan and contact the buyer with an update."
    )


def run_once(db: Session, config: Settings = settings) -> int:
    """Check all open shipments once and return the number of status changes."""
    now = datetime.now(timezone.utc)
    updated = 0
    for shipment in db.query(Shipment).filter(Shipment.status != "delivered").all():
        tracking = fetch_tracking(shipment, config)
        next_status = map_status(shipment, tracking.status, now)
        previous_status = shipment.status
        shipment.last_checked_at = now
        if tracking.delivery_timestamp:
            shipment.delivered_at = _parse_timestamp(tracking.delivery_timestamp)
        shipment.status = next_status
        if next_status in {"delayed", "failed"}:
            shipment.drafted_message = _drafted_message(
                next_status, shipment.tracking_number
            )
        if next_status != previous_status:
            db.add(
                AuditLog(
                    actor="delivery_watch",
                    event=f"shipment_{next_status}",
                    details={
                        "shipment_id": shipment.id,
                        "tracking_number": shipment.tracking_number,
                        "status": next_status,
                    },
                )
            )
            updated += 1
    db.commit()
    return updated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if not args.once:
        parser.error("only --once is supported")
    with SessionLocal() as db:
        run_once(db)


if __name__ == "__main__":
    main()
