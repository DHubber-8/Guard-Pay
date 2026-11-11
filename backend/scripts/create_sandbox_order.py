"""Create and capture one explicitly approved PayPal sandbox order.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.paypal.client import PayPalClient
from app.paypal.tracking import add_tracking

OUTPUT_PATH = BACKEND_DIR / "scripts" / "out" / "orders.json"


def _approval_link(data: dict[str, object]) -> str:
    for link in data.get("links", []):
        if isinstance(link, dict) and link.get("rel") in {"approve", "payer-action"}:
            href = link.get("href")
            if isinstance(href, str):
                return href
    raise RuntimeError("PayPal did not return a buyer approval link.")


def _capture_id(data: dict[str, object]) -> str:
    units = data.get("purchase_units", [])
    if isinstance(units, list) and units:
        unit = units[0]
        if isinstance(unit, dict):
            payments = unit.get("payments", {})
            if isinstance(payments, dict):
                captures = payments.get("captures", [])
                if isinstance(captures, list) and captures:
                    capture = captures[0]
                    if isinstance(capture, dict) and isinstance(capture.get("id"), str):
                        return capture["id"]
    raise RuntimeError("PayPal capture response did not contain a capture ID.")


async def create_order(args: argparse.Namespace) -> dict[str, str]:
    if bool(args.actor_id) != bool(args.case_id):
        raise ValueError("--actor-id and --case-id must be supplied together.")
    if bool(args.tracking_number) != bool(args.carrier):
        raise ValueError("--tracking-number and --carrier must be supplied together.")
    if args.tracking_number and not (args.actor_id and args.case_id):
        raise ValueError("Tracking requires --actor-id and --case-id approval context.")

    invoice_id = f"demo-{uuid4()}"
    paypal = PayPalClient()
    try:
        order_response = await paypal.request(
            "POST",
            "/v2/checkout/orders",
            headers={"PayPal-Request-Id": str(uuid4())},
            json={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "amount": {"currency_code": args.currency, "value": args.amount},
                        "invoice_id": invoice_id,
                    }
                ],
                "application_context": {
                    "user_action": "CONTINUE",
                    "return_url": args.return_url,
                    "cancel_url": args.cancel_url,
                },
            },
        )
        order_data = order_response.json()
        order_id = order_data["id"]
        print(f"Sandbox order created: {order_id}")
        print(f"Approve as buyer: {_approval_link(order_data)}")
        input("Press Enter after approving the order in the sandbox buyer flow...")
        print("WARNING: capturing the approved sandbox order is money-affecting.")
        capture_response = await paypal.request(
            "POST",
            f"/v2/checkout/orders/{order_id}/capture",
            headers={"PayPal-Request-Id": str(uuid4())},
            json={},
        )
        capture_id = _capture_id(capture_response.json())

        if args.tracking_number:
            await add_tracking(
                order_id,
                capture_id,
                args.tracking_number,
                args.carrier,
                notify_payer=args.notify_payer,
                actor_id=args.actor_id,
                case_id=args.case_id,
                client=paypal,
            )
        record = {"order_id": order_id, "capture_id": capture_id}
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote sandbox IDs to {OUTPUT_PATH}")
        return record
    finally:
        await paypal.aclose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--amount", default="25.00")
    parser.add_argument("--currency", default="USD")
    parser.add_argument("--return-url", default="http://localhost:8000/sandbox/return")
    parser.add_argument("--cancel-url", default="http://localhost:8000/sandbox/cancel")
    parser.add_argument("--tracking-number")
    parser.add_argument("--carrier")
    parser.add_argument("--notify-payer", action="store_true")
    parser.add_argument("--actor-id")
    parser.add_argument("--case-id")
    asyncio.run(create_order(parser.parse_args()))
