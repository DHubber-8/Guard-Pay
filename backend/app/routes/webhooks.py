"""PayPal webhook routes.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import AuditLog, Case
from app.db.session import get_db
from app.paypal.client import PayPalClient, PayPalError

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)

_VERIFY_PATH = "/v1/notifications/verify-webhook-signature"
_DISPUTE_EVENTS = {
    "CUSTOMER.DISPUTE.CREATED",
    "CUSTOMER.DISPUTE.UPDATED",
    "CUSTOMER.DISPUTE.RESOLVED",
}


@router.post("/paypal")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    """Verify and record a PayPal webhook event."""
    body = await request.body()
    webhook_id = settings.paypal_webhook_id.strip()
    if not webhook_id:
        logger.error("PAYPAL_WEBHOOK_ID is empty; refusing PayPal webhook event")
        return JSONResponse({"detail": "PayPal webhook verification is not configured"}, 400)

    try:
        event = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JSONResponse({"detail": "Invalid JSON payload"}, 400)
    if not isinstance(event, dict):
        return JSONResponse({"detail": "Webhook payload must be a JSON object"}, 400)

    verification_payload = {
        "auth_algo": request.headers.get("PAYPAL-AUTH-ALGO", ""),
        "cert_url": request.headers.get("PAYPAL-CERT-URL", ""),
        "transmission_id": request.headers.get("PAYPAL-TRANSMISSION-ID", ""),
        "transmission_sig": request.headers.get("PAYPAL-TRANSMISSION-SIG", ""),
        "transmission_time": request.headers.get("PAYPAL-TRANSMISSION-TIME", ""),
        "webhook_id": webhook_id,
        "webhook_event": event,
    }
    client = PayPalClient()
    try:
        verification_response = await client.request(
            "POST",
            _VERIFY_PATH,
            json=verification_payload,
        )
        verification = verification_response.json()
    except (PayPalError, httpx.HTTPError, ValueError):
        logger.warning("PayPal webhook signature verification request failed")
        return JSONResponse({"detail": "Webhook signature verification failed"}, 400)
    finally:
        await client.aclose()

    if verification.get("verification_status") != "SUCCESS":
        logger.warning("PayPal webhook signature verification was not successful")
        return JSONResponse({"detail": "Webhook signature verification failed"}, 400)

    event_id = event.get("id")
    event_type = event.get("event_type")
    if not isinstance(event_id, str) or not event_id:
        return JSONResponse({"detail": "Webhook event id is required"}, 400)
    if not isinstance(event_type, str) or not event_type:
        return JSONResponse({"detail": "Webhook event type is required"}, 400)

    if _has_processed_event(db, event_id):
        return JSONResponse({"status": "received"}, 200)

    resource = event.get("resource")
    if not isinstance(resource, dict):
        resource = {}
    resource_id = _resource_id(resource)
    case = None
    if event_type in _DISPUTE_EVENTS:
        dispute_id = resource_id
        if dispute_id:
            case = db.query(Case).filter(Case.paypal_dispute_id == dispute_id).first()
            if case is None:
                case = Case(
                    mode="merchant",
                    scenario="unclassified",
                    status=_event_status(event_type, resource),
                    paypal_dispute_id=dispute_id,
                    findings={},
                    risk_level="unknown",
                    evidence_status="missing",
                    overall_assessment="Pending dispute analysis",
                )
                db.add(case)
            else:
                case.status = _event_status(event_type, resource)

    audit = AuditLog(
        case=case,
        actor="paypal",
        event=event_type,
        details={
            "event_id": event_id,
            "event_type": event_type,
            "resource_id": resource_id,
            "resource": resource,
        },
    )
    db.add(audit)
    db.commit()

    if event_type in _DISPUTE_EVENTS:
        handle_dispute_event(event, db)
    else:
        logger.info("Ignoring unknown PayPal webhook event type: %s", event_type)
    return JSONResponse({"status": "received"}, 200)


def _has_processed_event(db: Session, event_id: str) -> bool:
    """Check the event id stored in the webhook audit records."""
    audits = db.query(AuditLog).filter(AuditLog.actor == "paypal").all()
    return any(audit.details.get("event_id") == event_id for audit in audits)


def _resource_id(resource: dict[str, Any]) -> str | None:
    value = resource.get("dispute_id") or resource.get("id")
    return value if isinstance(value, str) and value else None


def _event_status(event_type: str, resource: dict[str, Any]) -> str:
    status = resource.get("status")
    if isinstance(status, str) and status:
        return status
    return {
        "CUSTOMER.DISPUTE.CREATED": "OPEN",
        "CUSTOMER.DISPUTE.UPDATED": "OPEN",
        "CUSTOMER.DISPUTE.RESOLVED": "RESOLVED",
    }[event_type]


def handle_dispute_event(event: dict[str, Any], db: Session) -> None:
    """Extension point for later dispute analysis tasks."""
    logger.info(
        "Received PayPal dispute event %s (%s)",
        event.get("event_type"),
        event.get("id"),
    )
