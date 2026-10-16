"""PayPal refund operations."""


async def create_refund(order_id: str) -> dict[str, str]:
    # TODO: Create a refund through PayPal.
    return {"order_id": order_id, "status": "stub"}
