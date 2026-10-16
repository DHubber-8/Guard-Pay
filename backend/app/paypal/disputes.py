"""PayPal dispute operations."""


async def get_dispute(dispute_id: str) -> dict[str, str]:
    # TODO: Fetch a dispute from PayPal.
    return {"dispute_id": dispute_id}
