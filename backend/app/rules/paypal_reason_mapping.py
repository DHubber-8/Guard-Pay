"""Map PayPal dispute reasons to Role B scenario IDs."""

PAYPAL_REASON_MAP = {
    "MERCHANDISE_OR_SERVICE_NOT_RECEIVED": "item_not_received",
    "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED": "item_not_as_described",
    "UNAUTHORISED": "unauthorized_purchase",
}


def map_paypal_reason(reason: str | None) -> str | None:
    """Return a supported merchant scenario, or None if unknown."""
    if not isinstance(reason, str):
        return None

    return PAYPAL_REASON_MAP.get(reason.strip().upper())