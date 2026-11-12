"""Human approval and offer validation rules."""

from __future__ import annotations


from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Literal

OfferType = Literal["partial", "full", "replace"]
CENT = Decimal("0.01")


def validate_offer(offer: OfferType, amount: str | None, case_amount: Decimal) -> Decimal:
    """Validate and normalize an approval amount."""
    case_amount = case_amount.quantize(CENT, rounding=ROUND_HALF_UP)
    if offer == "replace":
        if amount is not None:
            raise ValueError("replace must not include an amount")
        return case_amount
    if offer == "full":
        if amount is not None:
            raise ValueError("full must not include an amount")
        return case_amount
    if amount is None:
        raise ValueError("partial requires an amount")
    try:
        normalized = Decimal(amount)
    except InvalidOperation as exc:
        raise ValueError("amount must be a decimal with two places") from exc
    if normalized != normalized.quantize(CENT) or normalized <= 0:
        raise ValueError("partial amount must be greater than zero with two decimals")
    if normalized > case_amount:
        raise ValueError("partial amount cannot exceed the case amount")
    return normalized



def requires_human_approval(action: str) -> bool:
    """Require human approval for external or money-moving actions."""
    return action in {
        "refund",
        "offer",
        "submit_evidence",
        "send_response",
        "cancel",
        "capture",
        "sign",
        "confirm",
    }
