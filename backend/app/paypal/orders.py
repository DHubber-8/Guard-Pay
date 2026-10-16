"""PayPal order operations."""


async def get_order(order_id: str) -> dict[str, str]:
    # TODO: Fetch an order from PayPal.
    return {"order_id": order_id}
