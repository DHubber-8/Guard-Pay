def adapt_stored_evidence(evidence_items):
    """Convert stored database evidence into Role B evidence fields."""

    evidence = {}

    buyer_photos = []

    for item in evidence_items:
        if item.source == "buyer_photo":
            buyer_photos.append(
                {
                    "description": item.description,
                    "source": item.source,
                    "verified": item.verified,
                    "file_ref": item.file_ref,
                    "description_only": True,
                }
            )

    if buyer_photos:
        evidence["received_product_photos"] = buyer_photos

    return evidence