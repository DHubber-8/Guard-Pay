"""PayPal-shaped synthetic responses for local demo mode."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.paypal.client import PayPalError

_FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"


def _fixtures() -> list[dict[str, Any]]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted(_FIXTURE_DIR.glob("*.json"))
    ]


def fixture_for_order(order_id: str) -> dict[str, Any]:
    for fixture in _fixtures():
        if fixture.get("paypal_order_id") == order_id:
            return fixture
    raise PayPalError(404, None, f"Simulated order {order_id} was not found")


def order_payload(order_id: str) -> dict[str, Any]:
    fixture = fixture_for_order(order_id)
    return {
        "id": fixture["paypal_order_id"],
        "status": "COMPLETED",
        "simulated": True,
        "payer": {
            "name": {"full_name": fixture["seller"]},
            "email_address": "demo-buyer@example.test",
        },
        "purchase_units": [
            {
                "amount": {"currency_code": fixture["currency"], "value": fixture["amount"]},
                "payments": {
                    "captures": [{"id": f"SIMULATED-CAPTURE-{fixture['fixture_id']}"}]
                },
                "shipping": {"name": {"full_name": fixture["seller"]}},
                "trackers": [{"tracking_number": fixture["tracking_number"]}],
            }
        ],
    }


def dispute_payload(dispute_id: str) -> dict[str, Any]:
    fixture = _fixtures()[0]
    return {
        "dispute_id": dispute_id,
        "reason": fixture["scenario"],
        "status": "OPEN",
        "simulated": True,
        "dispute_amount": {"currency_code": fixture["currency"], "value": fixture["amount"]},
        "allowed_response_options": {
            "make_offer": {},
            "accept_claim": {},
            "provide_evidence": {},
        },
    }


def dispute_summaries() -> list[dict[str, Any]]:
    return [
        {
            "dispute_id": f"SIMULATED-DISPUTE-{fixture['fixture_id']}",
            "reason": fixture["scenario"],
            "status": "OPEN",
            "dispute_amount": {
                "currency_code": fixture["currency"],
                "value": fixture["amount"],
            },
            "simulated": True,
        }
        for fixture in _fixtures()
    ]


def refund_result(capture_id: str) -> dict[str, str | bool]:
    return {
        "refund_id": f"SIMULATED-{capture_id}",
        "status": "COMPLETED",
        "simulated": True,
    }
