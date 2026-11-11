"""Merchant delivery shipment routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, StringConstraints
from sqlalchemy.orm import Session, selectinload

from app.auth import require_user
from app.db.models import AuditLog, Shipment, User
from app.db.session import get_db

router = APIRouter(
    prefix="/shipments",
    tags=["shipments"],
    dependencies=[Depends(require_user("merchant"))],
)


class ShipmentMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: Annotated[str, StringConstraints(min_length=1)]


def _shipment_response(shipment: Shipment) -> dict[str, object]:
    order = shipment.order
    return {
        "order": {
            "id": order.id,
            "order_number": (
                order.raw.get("order_number", order.paypal_order_id)
                if isinstance(order.raw, dict)
                else order.paypal_order_id
            ),
        },
        "buyer": order.buyer_reference,
        "carrier": shipment.carrier,
        "shipped_at": shipment.shipped_at,
        "expected_at": shipment.expected_at,
        "delivered_at": shipment.delivered_at,
        "status": shipment.status,
        "drafted_message": shipment.drafted_message,
    }


@router.get("")
def list_shipments(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    shipments = (
        db.query(Shipment)
        .options(selectinload(Shipment.order))
        .order_by(Shipment.id)
        .all()
    )
    return [_shipment_response(shipment) for shipment in shipments]


@router.post("/{order_id}/message")
def record_shipment_message(
    order_id: int,
    payload: ShipmentMessage,
    user: User = Depends(require_user("merchant")),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    shipment = (
        db.query(Shipment)
        .options(selectinload(Shipment.order))
        .filter(Shipment.order_id == order_id)
        .first()
    )
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    db.add(
        AuditLog(
            actor=user.email,
            event="shipment_message",
            details={"order_id": order_id, "text": payload.text},
        )
    )
    db.commit()
    return {"status": "recorded", "order_id": order_id}
