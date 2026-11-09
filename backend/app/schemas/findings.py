"""Shared findings contract."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

FindingStatus = Literal["verified", "unverified", "missing", "contradiction"]
RiskLevel = Literal["low", "medium", "high", "inconclusive"]
EvidenceStatus = Literal["complete", "partial", "missing"]
Action = Literal["sign", "confirm", "cancel"]
Currency = Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]
Amount = Annotated[str, StringConstraints(pattern=r"^\d+(?:\.\d{2})?$")]


def _reject_verdict_phrases(value: str) -> str:
    lowered = value.casefold()
    if "fraud confirmed" in lowered or "guaranteed" in lowered:
        raise ValueError("findings must not state a verdict or guarantee")
    return value


def _validate_amount(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("amount must be a decimal string") from exc
    if not amount.is_finite() or amount < 0:
        raise ValueError("amount must be a non-negative decimal string")
    return value


class FindingItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str
    status: FindingStatus
    detail: str | None = None

    _text_guard = field_validator("text", "detail")(_reject_verdict_phrases)


class Findings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    risk: RiskLevel
    evidence_status: EvidenceStatus
    items: list[FindingItem] | None = None
    suggested_action: str | None = None
    order_number: str | None = None
    buyer_name: str | None = None
    amount: Amount | None = Field(default=None)
    currency: Currency | None = None

    _text_guard = field_validator("suggested_action")(_reject_verdict_phrases)
    _amount_guard = field_validator("amount")(_validate_amount)


class Flag(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str
    why: str

    _text_guard = field_validator("text", "why")(_reject_verdict_phrases)


class PersonalFindings(Findings):
    reasons: list[str]
    safe_steps: list[str]
    flags: list[Flag] | None = None

    _text_guard = field_validator("reasons", "safe_steps")(
        lambda values: [_reject_verdict_phrases(value) for value in values]
    )


class RiskFindings(Findings):
    reasons: list[str]
    actions: list[Action]

    _text_guard = field_validator("reasons")(
        lambda values: [_reject_verdict_phrases(value) for value in values]
    )


def case_columns(findings: Findings) -> dict[str, str]:
    """Return the values needed for a Case row."""
    return {
        "risk_level": findings.risk,
        "evidence_status": findings.evidence_status,
    }
