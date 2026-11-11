"""Dispute classification agent."""
"""B1: Conservative keyword classifier; explicit scenario takes precedence."""
from app.rules.scenarios import SCENARIOS

KEYWORDS = {
    "item_not_received": ("not received", "not delivered", "missing parcel"),
    "item_not_as_described": ("not as described", "wrong item", "damaged item"),
    "unauthorized_purchase": ("unauthorized purchase", "unauthorised purchase"),
    "refund_abuse": ("duplicate refund", "refund abuse"),
    "own_evidence_check": ("review my evidence", "evidence check"),
    "unauthorized_payment": ("unauthorized payment", "unauthorised payment"),
    "payment_request_scam": ("payment request", "invoice scam", "pay immediately"),
    "account_takeover": ("account takeover", "unknown login", "account hacked"),
    "fake_purchase_or_seller": ("fake seller", "fake shop", "seller scam"),
    "unrecognised_charge_or_subscription": ("subscription", "recurring charge", "unrecognised charge"),
}

def classify_dispute(description: str, mode: str = "merchant", scenario_id: str = None) -> str:
    if scenario_id:
        scenario = SCENARIOS.get(scenario_id)
        if not scenario or scenario["mode"] != mode:
            raise ValueError("Invalid scenario for selected mode")
        return scenario_id
    text = description.casefold()
    matches = [key for key, terms in KEYWORDS.items()
               if SCENARIOS[key]["mode"] == mode and any(t in text for t in terms)]
    return matches[0] if len(matches) == 1 else "unknown"



