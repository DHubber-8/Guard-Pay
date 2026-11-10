"""Authenticated console summary endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session, selectinload

from app.auth import require_user
from app.config import Settings, settings
from app.db.models import Case, Order, Shipment
from app.db.session import get_db

router = APIRouter(tags=["console"], dependencies=[Depends(require_user("merchant"))])


@router.get("/flags")
def list_flags(db: Session = Depends(get_db)) -> list[dict[str, object]]:
    """Return review flags derived from current cases and shipment status."""
    flags: list[dict[str, object]] = []
    cases = db.query(Case).order_by(Case.id).all()
    for case in cases:
        if case.risk_level not in {"high", "medium"}:
            continue
        reasons = case.findings.get("risk_reasons", []) if isinstance(case.findings, dict) else []
        flags.append(
            {
                "id": f"case-risk-{case.id}",
                "level": case.risk_level,
                "kind": "Transaction",
                "subject": case.paypal_dispute_id or f"Case {case.id}",
                "text": reasons[0] if reasons else "Case risk requires review",
                "when": case.updated_at.isoformat() if case.updated_at else "",
                "query": case.paypal_dispute_id or str(case.id),
                "case": str(case.id),
            }
        )
    shipments = (
        db.query(Shipment)
        .options(selectinload(Shipment.order).selectinload(Order.cases))
        .filter(Shipment.status.in_(("delayed", "failed")))
        .order_by(Shipment.id)
        .all()
    )
    for shipment in shipments:
        flags.append(
            {
                "id": f"shipment-{shipment.id}",
                "level": "high" if shipment.status == "failed" else "medium",
                "kind": "Delivery",
                "subject": shipment.tracking_number,
                "text": f"Shipment status is {shipment.status}",
                "when": shipment.last_checked_at.isoformat() if shipment.last_checked_at else "",
                "query": shipment.tracking_number,
                "case": str(shipment.order.cases[0].id) if shipment.order and shipment.order.cases else None,
            }
        )
    return flags


@router.get("/workers/status")
def worker_status(request: Request) -> dict[str, object]:
    """Report configured worker cadence; workers do not persist run history."""
    config = getattr(request.app.state, "settings", settings)
    every = f"Every {config.workers_interval_seconds // 60} minutes"
    return {
        "enabled": config.workers_enabled,
        "deadline": {"lastRun": "Not recorded", "every": every},
        "delivery": {"lastRun": "Not recorded", "every": every},
    }
