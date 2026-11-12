"""Merchant case routes."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.auth import require_user
from app.db.models import AuditLog, Case
from app.db.session import get_db
from app.schemas.cases import CaseDetail, CaseRow, CaseType, TimelineItem
from pydantic import ValidationError

from app.schemas.findings import Findings
from app.pipeline import analyze_case
from app.paypal.disputes import get_dispute
from app.rules.paypal_reason_mapping import map_paypal_reason
from app.rules.stored_evidence_adapter import adapt_stored_evidence

router = APIRouter(
    prefix="/cases",
    tags=["cases"],
    dependencies=[Depends(require_user("merchant"))],
)


def case_type(case: Case) -> CaseType:
    """Derive the console category from the case's PayPal/scenario markers.

    Cases without a special scenario prefix are ordinary merchant disputes,
    including seeded fixtures and fresh PayPal webhook cases.
    """
    if case.paypal_dispute_id:
        return "dispute"
    scenario = case.scenario.lower()
    if scenario.startswith("order_help"):
        return "orderhelp"
    if scenario.startswith("risk"):
        return "risk"
    if scenario.startswith("delivery"):
        return "delivery"
    return "dispute"


def parsed_or_stored_findings(value: dict[str, Any] | None) -> Findings | dict[str, Any]:
    """Parse valid findings while preserving empty or legacy payloads."""
    stored = value or {}
    if not stored:
        return stored
    try:
        return Findings.model_validate(stored)
    except ValidationError:
        return stored


def _case_row(case: Case) -> CaseRow:
    data = CaseRow.model_validate(case).model_dump()
    data["findings"] = parsed_or_stored_findings(case.findings)
    return CaseRow.model_validate(data)


def _date(value: datetime | None) -> str:
    return (value.date() if value else date.today()).isoformat()


def _timeline(case: Case) -> list[TimelineItem]:
    entries: list[tuple[datetime | None, TimelineItem]] = []
    if case.order is not None:
        entries.append(
            (
                case.order.created_at,
                TimelineItem(
                    date=_date(case.order.created_at),
                    text=f"Order {case.order.paypal_order_id} created",
                    alert=False,
                ),
            )
        )
    for item in case.evidence_items:
        entries.append(
            (
                item.created_at,
                TimelineItem(
                    date=_date(item.created_at),
                    text=f"Evidence added: {item.description}",
                    alert=False,
                ),
            )
        )
    for audit in case.audit_logs:
        is_alert = "flag" in audit.event.lower() or "deadline" in audit.event.lower()
        entries.append(
            (
                audit.created_at,
                TimelineItem(
                    date=_date(audit.created_at),
                    text=f"{audit.actor}: {audit.event}",
                    alert=is_alert,
                ),
            )
        )
    entries.sort(key=lambda entry: entry[0] or datetime.min)
    return [entry[1] for entry in entries]


@router.get("", response_model=list[CaseRow])
def list_cases(
    type: Literal["dispute", "orderhelp", "risk", "delivery"] | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[CaseRow]:
    cases = db.query(Case).order_by(Case.id).all()
    if type is not None:
        cases = [case for case in cases if case_type(case) == type]
    return [_case_row(case) for case in cases[offset : offset + limit]]


@router.get("/{case_id}", response_model=CaseDetail)
def get_case(case_id: int, db: Session = Depends(get_db)) -> CaseDetail:
    case = (
        db.query(Case)
        .options(
            selectinload(Case.order),
            selectinload(Case.evidence_items),
            selectinload(Case.offers),
            selectinload(Case.audit_logs),
        )
        .filter(Case.id == case_id)
        .one_or_none()
    )
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    data = _case_row(case).model_dump()
    data.update(
        order=case.order,
        evidence_items=case.evidence_items,
        offers=case.offers,
        timeline=_timeline(case),
    )
    return CaseDetail.model_validate(data)

@router.post("/{case_id}/analyze")
async def analyze_merchant_case(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Analyze a merchant case without modifying the database."""

    case = (
        db.query(Case)
        .options(selectinload(Case.evidence_items))
        .filter(Case.id == case_id)
        .one_or_none()
    )

    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    dispute = None

    if case.paypal_dispute_id:
        try:
            dispute = await get_dispute(case.paypal_dispute_id)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail="Unable to retrieve PayPal dispute details",
            ) from exc

    scenario_id = None

    if dispute is not None:
        scenario_id = map_paypal_reason(dispute.reason)

    supported_scenarios = {
        "item_not_received",
        "item_not_as_described",
        "unauthorized_purchase",
        "refund_abuse",
        "own_evidence_check",
    }

    if scenario_id is None and case.scenario in supported_scenarios:
        scenario_id = case.scenario

    if scenario_id is None:
        raise HTTPException(
            status_code=422,
            detail="Unable to identify a supported dispute scenario",
        )

    evidence = adapt_stored_evidence(case.evidence_items)

    if dispute is not None:
        if dispute.disputed_transactions:
            evidence["transaction_details"] = [
                transaction.model_dump()
                for transaction in dispute.disputed_transactions
            ]

        if dispute.messages:
            evidence["buyer_complaint"] = [
                message.model_dump()
                for message in dispute.messages
                if message.posted_by == "BUYER"
                and message.content
            ]

            if not evidence["buyer_complaint"]:
                del evidence["buyer_complaint"]

    result = analyze_case(
        {
            "case_id": case.id,
            "mode": "merchant",
            "scenario_id": scenario_id,
            "evidence": evidence,
            "triggered_indicators": [],
        },
        use_ai=False,
    )

    return result
