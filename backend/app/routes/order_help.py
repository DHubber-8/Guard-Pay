"""Buyer order-help routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/order-help", tags=["order-help"])


@router.post("")
def create_order_help() -> dict[str, str]:
    # TODO: Create an AI-assisted buyer order-help request.
    return {"status": "stub"}


@router.get("/{order_id}")
def get_order_help(order_id: str) -> dict[str, str]:
    # TODO: Return the order-help status and explanation.
    return {"order_id": order_id, "status": "stub"}
