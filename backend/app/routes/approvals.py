"""Merchant approval routes."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db.models import Agreement, Approval, AuditLog, Case, Offer, Order, User
from app.db.session import get_db
from app.paypal import refunds
from app.paypal.client import PayPalError
from app.rules.approval_policy import validate_offer
from app.schemas.approvals import ApprovalRequest, ApprovalResponse
from app.schemas.findings import Findings

router = APIRouter(prefix="/cases", tags=["approvals"])
RefundPerformer = Callable[..., Awaitable[refunds.RefundResult]]


async def perform_refund(
    capture_id: str,
    amount: str,
    currency: str,
    note: str | None,
    approver_id: str,
    case_id: int,
) -> refunds.RefundResult:
    """Perform a PayPal refund after the approval transaction commits."""
    return await refunds.refund_capture(
        capture_id,
        amount,
        currency,
        note,
        approver_id=str(approver_id),
        case_id=str(case_id),
    )


def refund_dependency() -> RefundPerformer:
    return perform_refund


def _case_amount(case: Case) -> Decimal:
    if case.order is None:
        raise HTTPException(status_code=409, detail="Case has no order amount")
    return Decimal(case.order.amount)


def _approval_exists(case: Case) -> bool:
    return any(approval.decision == "approve" for approval in case.approvals)


def _suggested_action(case: Case) -> str:
    try:
        findings = Findings.model_validate(case.findings or {})
    except ValidationError:
        return ""
    return findings.suggested_action or ""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _capture_id(order: Order) -> str | None:
    capture_ids = order.raw.get("capture_ids") if isinstance(order.raw, dict) else None
    if isinstance(capture_ids, list) and capture_ids and isinstance(capture_ids[0], str):
        return capture_ids[0]
    if isinstance(capture_ids, str):
        return capture_ids
    return None


def _record_refund_failure(
    db: Session, case: Case, user: User, detail: str
) -> None:
    case.status = "refund_failed"
    db.add(
        AuditLog(
            case=case,
            actor=str(user.id),
            event="refund.failed",
            details={"message": detail},
            created_at=_now(),
        )
    )
    db.commit()


@router.post(
    "/{case_id}/approve",
    response_model=ApprovalResponse,
    dependencies=[Depends(require_user("merchant"))],
)
async def approve_case(
    case_id: int,
    payload: ApprovalRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user("merchant")),
    refund: RefundPerformer = Depends(refund_dependency),
) -> ApprovalResponse:
    case = db.query(Case).filter(Case.id == case_id).one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if _approval_exists(case) or case.status in {"resolved", "refund_sent"}:
        raise HTTPException(status_code=409, detail="Case has already been approved")

    try:
        amount = validate_offer(payload.offer, payload.amount, _case_amount(case))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    now = _now()
    approval = Approval(
        case=case,
        action_type=payload.offer,
        approver_id=str(user.id),
        ai_recommendation=_suggested_action(case),
        decision="approve",
        notes=payload.message,
        decided_at=now,
    )
    offer = Offer(
        case=case,
        type=payload.offer,
        amount=amount,
        status="proposed",
        details={"message": payload.message} if payload.message is not None else {},
        created_at=now,
        updated_at=now,
    )
    db.add_all(
        [
            approval,
            offer,
            AuditLog(
                case=case,
                actor=str(user.id),
                event="approval.created",
                details={"offer": payload.offer, "amount": str(amount)},
                created_at=now,
            ),
        ]
    )
    db.commit()

    if payload.offer == "replace":
        case.status = "replacement_offered"
        db.commit()
        return ApprovalResponse(
            case_id=case.id,
            decision="approve",
            status=case.status,
            refund_id=None,
        )

    if case.order is None:
        _record_refund_failure(db, case, user, "Case has no order for refund")
        raise HTTPException(status_code=409, detail="Case has no order for refund")
    capture_id = _capture_id(case.order)
    if capture_id is None:
        _record_refund_failure(db, case, user, "No capture id is available for this order")
        raise HTTPException(status_code=409, detail="No capture id is available for this order")

    try:
        result = await refund(
            capture_id,
            str(amount),
            case.order.currency,
            payload.message,
            str(user.id),
            case.id,
        )
    except refunds.RefundNotAllowedError as exc:
        _record_refund_failure(db, case, user, str(exc))
        raise HTTPException(status_code=409, detail=f"Refund not allowed: {exc}") from exc
    except PayPalError as exc:
        _record_refund_failure(db, case, user, str(exc))
        raise HTTPException(status_code=502, detail=f"PayPal refund failed: {exc}") from exc

    case.status = "refund_sent"
    db.add(
        Agreement(
            case=case,
            type="refund",
            amount=amount,
            status="sent",
            details={"refund_id": result.refund_id},
            created_at=_now(),
            updated_at=_now(),
        )
    )
    db.add(
        AuditLog(
            case=case,
            actor=str(user.id),
            event="refund.sent",
            details={"refund_id": result.refund_id, "amount": str(amount)},
            created_at=_now(),
        )
    )
    db.commit()
    return ApprovalResponse(
        case_id=case.id,
        decision="approve",
        status=case.status,
        refund_id=result.refund_id,
    )


@router.post(
    "/{case_id}/decline",
    response_model=ApprovalResponse,
    dependencies=[Depends(require_user("merchant"))],
)
def decline_case(
    case_id: int,
    payload: ApprovalRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user("merchant")),
) -> ApprovalResponse:
    case = db.query(Case).filter(Case.id == case_id).one_or_none()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if _approval_exists(case) or case.status in {"resolved", "refund_sent"}:
        raise HTTPException(status_code=409, detail="Case has already been approved")
    now = _now()
    case.status = "declined"
    db.add_all(
        [
            Approval(
                case=case,
                action_type=payload.offer,
                approver_id=str(user.id),
                ai_recommendation=_suggested_action(case),
                decision="decline",
                notes=payload.message,
                decided_at=now,
            ),
            AuditLog(
                case=case,
                actor=str(user.id),
                event="approval.declined",
                details={"offer": payload.offer},
                created_at=now,
            ),
        ]
    )
    db.commit()
    return ApprovalResponse(
        case_id=case.id,
        decision="decline",
        status=case.status,
        refund_id=None,
    )
