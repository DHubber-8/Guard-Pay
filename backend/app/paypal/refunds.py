"""PayPal Payments v2 refund operations.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import asyncio
import argparse
import hashlib
import json
import sys
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.paypal.client import PayPalClient
from app.paypal.disputes import ApprovalRequiredError


class CaptureDetails(BaseModel):
    model_config = ConfigDict(extra="ignore")

    capture_id: str
    status: str | None = None
    amount: str | None = None
    currency: str | None = None
    refunded_amount: str | None = None

    @property
    def remaining_refundable_amount(self) -> Decimal:
        original = _decimal(self.amount)
        refunded = _decimal(self.refunded_amount)
        return max(Decimal("0"), original - refunded)


class RefundResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    refund_id: str
    status: str | None = None


class RefundNotAllowedError(ValueError):
    """Raised when PayPal reports that a capture cannot be refunded."""


def _decimal(value: str | None) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise RefundNotAllowedError(f"PayPal returned an invalid money value: {value}.") from exc


def _reported_refunded_amount(data: dict[str, Any]) -> str | None:
    for key in ("refunded_amount", "amount_refunded", "refund_amount"):
        value = data.get(key)
        if isinstance(value, dict):
            value = value.get("value")
        if value is not None:
            return str(value)

    refunds = data.get("refunds")
    if isinstance(refunds, list):
        amounts = [
            item.get("amount", {}).get("value")
            for item in refunds
            if isinstance(item, dict) and isinstance(item.get("amount"), dict)
        ]
        if amounts:
            return str(sum((_decimal(str(value)) for value in amounts), Decimal("0")))
    return None


def _capture(data: dict[str, Any], capture_id: str) -> CaptureDetails:
    amount = data.get("amount") or {}
    return CaptureDetails(
        capture_id=data.get("id", capture_id),
        status=data.get("status"),
        amount=amount.get("value"),
        currency=amount.get("currency_code"),
        refunded_amount=_reported_refunded_amount(data),
    )


async def get_capture(
    capture_id: str, client: PayPalClient | None = None
) -> CaptureDetails:
    """Fetch the capture and the refund information PayPal reports."""
    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        response = await paypal.request("GET", f"/v2/payments/captures/{capture_id}")
        return _capture(response.json(), capture_id)
    finally:
        if owned_client:
            await paypal.aclose()


def _request_id(capture_id: str, amount: str | None, case_id: str) -> str:
    material = json.dumps(
        {"capture_id": capture_id, "amount": amount, "case_id": case_id},
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return hashlib.sha256(material).hexdigest()[:32]


async def refund_capture(
    capture_id: str,
    amount: str | None = None,
    currency: str | None = None,
    note: str | None = None,
    *,
    approver_id: str | None = None,
    case_id: str | None = None,
    client: PayPalClient | None = None,
) -> RefundResult:
    """Refund a capture after approval and a fresh refundable-state check."""
    if not approver_id or not case_id:
        raise ApprovalRequiredError(
            "Explicit approval is required: provide both approver_id and case_id."
        )

    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        capture = await get_capture(capture_id, paypal)
        if capture.status not in {"COMPLETED", "PARTIALLY_REFUNDED"}:
            raise RefundNotAllowedError(
                f"Capture {capture_id} is not refundable in state {capture.status!r}."
            )

        remaining = capture.remaining_refundable_amount
        requested = remaining if amount is None else _decimal(amount)
        if requested <= 0:
            raise RefundNotAllowedError("Refund amount must be greater than zero.")
        if requested > remaining:
            raise RefundNotAllowedError(
                f"Refund amount {requested} exceeds the remaining refundable amount {remaining}."
            )
        if currency is not None and currency != capture.currency:
            raise RefundNotAllowedError(
                f"Refund currency {currency!r} does not match capture currency {capture.currency!r}."
            )

        body: dict[str, Any] = {}
        if amount is not None:
            body["amount"] = {
                "value": amount,
                "currency_code": currency or capture.currency,
            }
        if note is not None:
            body["note_to_payer"] = note
        response = await paypal.request(
            "POST",
            f"/v2/payments/captures/{capture_id}/refund",
            headers={"PayPal-Request-Id": _request_id(capture_id, amount, case_id)},
            json=body,
        )
        data = response.json()
        return RefundResult(refund_id=data["id"], status=data.get("status"))
    finally:
        if owned_client:
            await paypal.aclose()


async def _main(args: argparse.Namespace) -> None:
    if args.refund:
        print("WARNING: this will submit a live PayPal refund.")
        result = await refund_capture(
            args.capture_id,
            None if args.amount in (None, "full") else args.amount,
            approver_id=args.approver,
            case_id=args.case,
        )
    else:
        result = await get_capture(args.capture_id)
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("capture_id")
    parser.add_argument("--refund", action="store_true")
    parser.add_argument("--amount")
    parser.add_argument("--approver")
    parser.add_argument("--case")
    asyncio.run(_main(parser.parse_args()))
