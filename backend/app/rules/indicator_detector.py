"""Evidence-based warning indicator detection for synthetic disputes.

Uses structured evidence supplied by the demo frontend.
Does not independently verify PayPal, carrier, or user records.
A warning indicator is not proof of fraud.
"""

from app.rules.scenarios import get_scenario


def detect_indicators(scenario_id: str, evidence: dict) -> list[str]:
    """Detect indicators supported by structured demo evidence."""

    scenario = get_scenario(scenario_id)

    if not scenario or not isinstance(evidence, dict):
        return []

    detected = []

    # --------------------------------------------------
    # 1. Item Not Received
    # --------------------------------------------------

    if scenario_id == "item_not_received":

        if (
            evidence.get("delivery_status") == "delivered"
            and evidence.get("buyer_claim") == "not_received"
            and evidence.get("delivery_verified") is True
        ):
            detected.append("ITEM_NOT_RECEIVED_01")

        if evidence.get("address_mismatch_verified") is True:
            detected.append("ITEM_NOT_RECEIVED_02")

        if evidence.get("delivery_claim_unsupported") is True:
            detected.append("ITEM_NOT_RECEIVED_03")

    # --------------------------------------------------
    # 2. Unauthorized Purchase
    # --------------------------------------------------

    elif scenario_id == "unauthorized_purchase":

        if evidence.get("new_device") is True:
            detected.append("UNAUTHORIZED_PURCHASE_01")

        if evidence.get("new_shipping_address") is True:
            detected.append("UNAUTHORIZED_PURCHASE_02")

        if (
            evidence.get("recent_password_reset") is True
            and evidence.get("new_device") is True
        ):
            detected.append("UNAUTHORIZED_PURCHASE_03")

    # --------------------------------------------------
    # 3. Item Not as Described
    # --------------------------------------------------

    elif scenario_id == "item_not_as_described":

        if evidence.get("description_contradiction_verified") is True:
            detected.append("ITEM_NOT_AS_DESCRIBED_01")

        if evidence.get("return_item_mismatch_verified") is True:
            detected.append("ITEM_NOT_AS_DESCRIBED_02")

        if evidence.get("misleading_listing_verified") is True:
            detected.append("ITEM_NOT_AS_DESCRIBED_03")

    # --------------------------------------------------
    # 4. Payment Request Scam
    # --------------------------------------------------

    elif scenario_id == "payment_request_scam":

        if evidence.get("urgent_payment_pressure") is True:
            detected.append("PAYMENT_REQUEST_SCAM_01")

        if evidence.get("impersonation_claim") is True:
            detected.append("PAYMENT_REQUEST_SCAM_02")

        if evidence.get("credential_request") is True:
            detected.append("PAYMENT_REQUEST_SCAM_03")

    # --------------------------------------------------
    # 5. Unrecognised Charge or Subscription
    # --------------------------------------------------

    elif scenario_id == "unrecognised_charge_or_subscription":

        if evidence.get("unknown_subscription_verified") is True:
            detected.append(
                "UNRECOGNISED_CHARGE_OR_SUBSCRIPTION_01"
            )

        if evidence.get("charge_after_cancellation_verified") is True:
            detected.append(
                "UNRECOGNISED_CHARGE_OR_SUBSCRIPTION_02"
            )

        if evidence.get("billing_amount_mismatch_verified") is True:
            detected.append(
                "UNRECOGNISED_CHARGE_OR_SUBSCRIPTION_03"
            )

    # Only return indicators defined in the scenario catalog.
    valid_ids = {
        indicator["id"]
        for indicator in scenario["suspicious_indicators"]
    }

    return [
        indicator
        for indicator in dict.fromkeys(detected)
        if indicator in valid_ids
    ]