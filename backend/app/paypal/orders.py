"""PayPal order operations.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import asyncio
import sys
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings
from app.paypal.client import PayPalClient


class OrderSummary(BaseModel):
    """Fields copied from the PayPal Orders v2 response."""

    model_config = ConfigDict(extra="ignore")

    id: str
    status: str
    amount: str | None = None
    currency: str | None = None
    payer_name: str | None = None
    payer_email: str | None = None
    capture_ids: list[str] = Field(default_factory=list)
    shipping: dict[str, Any] | None = None
    tracking: list[dict[str, Any]] | None = None


async def get_order(order_id: str, client: PayPalClient | None = None) -> OrderSummary:
    """Fetch and parse one PayPal Orders v2 order."""
    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        response = await paypal.request("GET", f"/v2/checkout/orders/{order_id}")
        data = response.json()
    finally:
        if owned_client:
            await paypal.aclose()

    purchase_unit = (data.get("purchase_units") or [{}])[0]
    order_amount = purchase_unit.get("amount") or {}
    payer = data.get("payer") or {}
    payer_name_data = payer.get("name") or {}
    payer_name = (
        payer_name_data.get("alternate_full_name")
        or payer_name_data.get("full_name")
        or " ".join(
            part
            for part in (
                payer_name_data.get("given_name"),
                payer_name_data.get("surname"),
            )
            if part
        )
        or None
    )
    captures = (purchase_unit.get("payments") or {}).get("captures") or []
    shipping = purchase_unit.get("shipping")
    tracking = purchase_unit.get("tracking") or purchase_unit.get("trackers")

    return OrderSummary(
        id=data["id"],
        status=data["status"],
        amount=order_amount.get("value"),
        currency=order_amount.get("currency_code"),
        payer_name=payer_name,
        payer_email=payer.get("email_address"),
        capture_ids=[capture["id"] for capture in captures if capture.get("id")],
        shipping=shipping,
        tracking=tracking,
    )


async def _main(order_id: str) -> None:
    order = await get_order(order_id)
    print(order.model_dump_json(indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.paypal.orders <ORDER_ID>")
    asyncio.run(_main(sys.argv[1]))
