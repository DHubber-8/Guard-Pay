"""Response schemas for merchant case endpoints."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.findings import Findings

CaseType = Literal["dispute", "orderhelp", "risk", "delivery"]


class CaseRow(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    mode: str
    scenario: str
    status: str
    paypal_dispute_id: str | None
    order_id: int | None
    findings: Findings | dict[str, Any]
    risk_level: str
    evidence_status: str
    overall_assessment: str
    response_deadline: datetime | None
    created_at: datetime | None
    updated_at: datetime | None


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    paypal_order_id: str
    amount: Decimal
    currency: str
    status: str
    buyer_reference: str
    tracking_number: str | None
    carrier: str | None
    raw: dict[str, Any]
    created_at: datetime | None


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    case_id: int
    description: str
    source: str
    verified: bool
    file_ref: str | None
    created_at: datetime | None


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    case_id: int
    type: str
    amount: Decimal
    status: str
    details: dict[str, Any]
    created_at: datetime | None
    updated_at: datetime | None


class TimelineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: str
    text: str
    alert: bool


class CaseDetail(CaseRow):
    order: OrderResponse | None
    evidence_items: list[EvidenceResponse]
    offers: list[OfferResponse]
    timeline: list[TimelineItem]
