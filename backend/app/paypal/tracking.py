"""PayPal Orders v2 shipment-tracking operations.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.paypal.client import PayPalClient
from app.paypal.disputes import ApprovalRequiredError
from app.paypal.orders import OrderSummary, get_order


class TrackingResult(BaseModel):
    class Config:
        extra = "ignore"

    order_id: str
    capture_id: str
    tracking_number: str
    carrier: str
    notify_payer: bool = False


def _require_tracking_value(value: str, field: str) -> None:
    if not value or not value.strip():
        raise ValueError(f"{field} must be non-empty.")


async def add_tracking(
    order_id: str,
    capture_id: str,
    tracking_number: str,
    carrier: str,
    *,
    notify_payer: bool = False,
    actor_id: str | None = None,
    case_id: str | None = None,
    client: PayPalClient | None = None,
) -> TrackingResult:
    """Add shipment tracking to an order after explicit actor approval."""
    if not actor_id or not case_id:
        raise ApprovalRequiredError(
            "Explicit approval is required: provide both actor_id and case_id."
        )
    _require_tracking_value(tracking_number, "tracking_number")
    _require_tracking_value(carrier, "carrier")

    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        response = await paypal.request(
            "POST",
            f"/v2/checkout/orders/{order_id}/track",
            json={
                "capture_id": capture_id,
                "tracking_number": tracking_number,
                "carrier": carrier,
                "notify_payer": notify_payer,
            },
        )
        data: dict[str, Any] = response.json() if response.content else {}
        return TrackingResult(
            order_id=order_id,
            capture_id=data.get("capture_id", capture_id),
            tracking_number=data.get("tracking_number", tracking_number),
            carrier=data.get("carrier", carrier),
            notify_payer=data.get("notify_payer", notify_payer),
        )
    finally:
        if owned_client:
            await paypal.aclose()


async def get_tracking(
    order_id: str, client: PayPalClient | None = None
) -> OrderSummary:
    """Read order tracking through the existing Orders v2 order wrapper."""
    return await get_order(order_id, client)
