"""Synthetic, read-only carrier tracking endpoint.

Owner: Digant
Status: in progress

Tracking-number patterns:
``DELIVERED`` -> delivered with a delivery timestamp.
``IN_TRANSIT`` -> in transit with a recent scan.
``STUCK-<N>`` -> in transit with no scan for N days.
``LOST`` -> lost with a last known scan and no delivery timestamp.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/mock-carrier", tags=["mock-carrier"])


class MockTrackingResponse(BaseModel):
    mock: bool = True
    tracking_number: str
    status: str
    last_event: str
    delivery_timestamp: str | None = None


def tracking_status(tracking_number: str) -> MockTrackingResponse:
    """Return deterministic synthetic tracking based on a tracking-number pattern."""
    normalized = tracking_number.strip().upper()
    now = datetime.now(timezone.utc)
    if "DELIVERED" in normalized:
        return MockTrackingResponse(
            tracking_number=tracking_number,
            status="delivered",
            last_event="Package delivered",
            delivery_timestamp=(now - timedelta(days=1)).isoformat(),
        )
    if "LOST" in normalized:
        return MockTrackingResponse(
            tracking_number=tracking_number,
            status="lost",
            last_event="Carrier investigation opened after last scan",
        )
    stuck_match = re.search(r"STUCK-(\d+)", normalized)
    if stuck_match:
        days = int(stuck_match.group(1))
        return MockTrackingResponse(
            tracking_number=tracking_number,
            status="stuck",
            last_event=f"No scan for {days} days",
        )
    return MockTrackingResponse(
        tracking_number=tracking_number,
        status="in_transit",
        last_event="Package accepted at carrier facility",
    )


@router.get("/tracking/{tracking_number}", response_model=MockTrackingResponse)
def get_mock_tracking(tracking_number: str) -> MockTrackingResponse:
    """Return synthetic tracking data; this endpoint never calls a carrier."""
    return tracking_status(tracking_number)
