"""Convert demo fixture data into Role B evidence format."""


def adapt_fixture_evidence(fixture: dict) -> dict:
    """Extract available evidence without inventing missing information."""

    evidence = {}

    # Transaction information
    if fixture.get("paypal_order_id"):
        evidence["transaction_details"] = {
            "order_id": fixture["paypal_order_id"],
            "amount": fixture.get("amount"),
            "currency": fixture.get("currency"),
            "source": "paypal",
            "verified": any(
                item.get("source") == "paypal" and item.get("verified")
                for item in fixture.get("evidence", [])
            ),
        }

    # Buyer complaint
    buyer_messages = [
        message.get("text")
        for message in fixture.get("buyer_chat", [])
        if message.get("speaker") == "buyer" and message.get("text")
    ]

    if buyer_messages:
        evidence["buyer_complaint"] = {
            "messages": buyer_messages,
            "source": "buyer_chat",
            "verified": False,
        }

    # Photo descriptions (not verified photographs)
    if fixture.get("photo_descriptions"):
        evidence["received_product_photos"] = {
            "descriptions": fixture["photo_descriptions"],
            "source": "buyer_photo",
            "verified": False,
            "description_only": True,
        }

    # Do not invent original_product_description.
    # Do not invent return_inspection_report.

    return evidence