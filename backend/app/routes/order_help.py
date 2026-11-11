"""Buyer order-help routes."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.models import AuditLog, Case, EvidenceItem, Offer, Order
from app.db.session import get_db
from app.mocks.carrier import tracking_status
from app.schemas.order_help import (
    BuyerMessageRequest,
    OrderHelpAnswer,
    OrderHelpLookupRequest,
    OrderHelpLookupResponse,
    OrderHelpRequest,
    OrderHelpSentResponse,
    OrderHelpStatusResponse,
    OrderSummary,
    TrackingStep,
)

router = APIRouter(prefix="/order-help", tags=["order-help"])
_attempts: defaultdict[str, deque[float]] = defaultdict(deque)
_attempts_lock = Lock()
_MAX_REQUESTS = 10
_WINDOW_SECONDS = 60
_NOT_FOUND = "We couldn't find that order"


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _attempts_lock:
        attempts = _attempts[ip]
        while attempts and now - attempts[0] >= _WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= _MAX_REQUESTS:
            raise HTTPException(status_code=429, detail="Too many order-help requests")
        attempts.append(now)


def _order_number(order: Order) -> str:
    raw_number = order.raw.get("order_number") if isinstance(order.raw, dict) else None
    return str(raw_number or order.paypal_order_id)


def _find_order(db: Session, order_number: str, email: str) -> Order:
    normalized_email = email.strip().casefold()
    orders = db.query(Order).all()
    order = next(
        (
            candidate
            for candidate in orders
            if _order_number(candidate) == order_number
            and candidate.buyer_reference.strip().casefold() == normalized_email
        ),
        None,
    )
    if order is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    return order


def _tracking_steps(order: Order, config: Settings = settings) -> list[TrackingStep]:
    if not order.tracking_number:
        return [
            TrackingStep(status="notracking", text="No tracking number is available yet.")
        ]
    tracking = tracking_status(order.tracking_number)
    if config.carrier_api_base_url:
        return [
            TrackingStep(
                status=tracking.status,
                text=f"Carrier tracking: {tracking.last_event}.",
            )
        ]
    return [
        TrackingStep(status=tracking.status, text=tracking.last_event),
    ]


def _summary(order: Order) -> OrderSummary:
    return OrderSummary(
        id=order.id,
        order_number=_order_number(order),
        amount=f"{order.amount:.2f}",
        currency=order.currency,
        status=order.status,
        tracking_number=order.tracking_number,
        carrier=order.carrier,
    )


def explain_order_help(
    reason: str, not_arrived_reason: str | None, order: Order
) -> str:
    """Return automated, non-verdict decision support for a buyer."""
    tracking = tracking_status(order.tracking_number).status if order.tracking_number else "notracking"
    label = not_arrived_reason or tracking
    return (
        f"Automated update: the available order information shows a {label} "
        f"tracking situation. Please review the tracking steps and contact the "
        f"seller through the order-help request if you still need assistance."
    )


def _case_or_404(db: Session, case_id: int) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.mode == "merchant").one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Order-help request not found")
    return case


@router.post("/lookup", response_model=OrderHelpLookupResponse)
def lookup_order(
    payload: OrderHelpLookupRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> OrderHelpLookupResponse:
    _rate_limit(request)
    order = _find_order(db, payload.order_number, payload.email)
    db.add(
        AuditLog(
            actor="buyer",
            event="order_help_lookup",
            details={"order_number": payload.order_number},
        )
    )
    db.commit()
    config = getattr(request.app.state, "settings", settings)
    return OrderHelpLookupResponse(
        order=_summary(order),
        tracking_steps=_tracking_steps(order, config),
    )


@router.post("", response_model=OrderHelpAnswer | OrderHelpSentResponse)
def create_order_help(
    payload: OrderHelpRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> OrderHelpAnswer | OrderHelpSentResponse:
    _rate_limit(request)
    order = _find_order(db, payload.order_number, payload.email)
    now = datetime.now(timezone.utc)
    instant_answer = payload.reason == "not_arrived" and payload.not_arrived_reason in {
        "customs",
        "late",
        "stuck",
        "notracking",
    }
    case = Case(
        mode="merchant",
        scenario=f"order_help_{payload.reason}",
        status="waiting",
        order=order,
        findings={
            "not_arrived_reason": payload.not_arrived_reason,
            "buyer_note": payload.note,
        },
        risk_level="inconclusive",
        evidence_status="partial",
        overall_assessment="Automated order-help request pending seller review",
    )
    db.add(case)
    db.flush()
    for photo in payload.photos:
        db.add(
            EvidenceItem(
                case=case,
                description=photo,
                source="buyer_photo",
                verified=False,
                created_at=now,
            )
        )
    db.add(
        AuditLog(
            case=case,
            actor="buyer",
            event="buyer_message",
            details={"text": payload.note or "", "reason": payload.reason},
            created_at=now,
        )
    )
    db.commit()
    config = getattr(request.app.state, "settings", settings)
    steps = _tracking_steps(order, config)
    if instant_answer:
        return OrderHelpAnswer(
            type="answer",
            explanation=explain_order_help(
                payload.reason, payload.not_arrived_reason, order
            ),
            tracking_steps=steps,
        )
    return OrderHelpSentResponse(
        type="sent_to_seller",
        reply_due=(now + timedelta(days=2)).isoformat(),
    )


@router.get("/{case_id}", response_model=OrderHelpStatusResponse)
def get_order_help(case_id: int, db: Session = Depends(get_db)) -> OrderHelpStatusResponse:
    case = _case_or_404(db, case_id)
    offer = db.query(Offer).filter(Offer.case_id == case.id).order_by(Offer.id.desc()).first()
    seller_reply = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case.id, AuditLog.event == "seller_reply")
        .order_by(AuditLog.id.desc())
        .first()
    )
    return OrderHelpStatusResponse(
        id=case.id,
        status=case.status if case.status in {"waiting", "offer", "resolved"} else "waiting",
        offer=(
            {
                "id": offer.id,
                "type": offer.type,
                "amount": f"{offer.amount:.2f}",
                "status": offer.status,
                "details": offer.details,
            }
            if offer
            else None
        ),
        seller_reply=(
            {
                "text": str(seller_reply.details.get("text", "")),
                "sent_at": seller_reply.created_at.isoformat(),
            }
            if seller_reply and seller_reply.created_at
            else None
        ),
    )


@router.post("/{case_id}/accept")
def accept_order_help(case_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    case = _case_or_404(db, case_id)
    offer = db.query(Offer).filter(Offer.case_id == case.id).order_by(Offer.id.desc()).first()
    if offer is None:
        raise HTTPException(status_code=409, detail="No seller offer is available")
    offer.status = "accepted"
    case.status = "resolved"
    db.add(AuditLog(case=case, actor="buyer", event="offer_accepted", details={}))
    db.commit()
    return {"status": case.status}


@router.post("/{case_id}/decline")
def decline_order_help(case_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    case = _case_or_404(db, case_id)
    offer = db.query(Offer).filter(Offer.case_id == case.id).order_by(Offer.id.desc()).first()
    if offer is None:
        raise HTTPException(status_code=409, detail="No seller offer is available")
    offer.status = "declined"
    case.status = "waiting"
    db.add(AuditLog(case=case, actor="buyer", event="offer_declined", details={}))
    db.commit()
    return {"status": case.status}


@router.post("/{case_id}/message")
def message_order_help(
    case_id: int,
    payload: BuyerMessageRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    case = _case_or_404(db, case_id)
    db.add(
        AuditLog(
            case=case,
            actor="buyer",
            event="buyer_message",
            details={"text": payload.text},
        )
    )
    db.commit()
    return {"status": "sent"}
