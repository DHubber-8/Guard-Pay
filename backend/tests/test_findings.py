"""Tests for the shared findings contract."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.schemas.findings import (
    FindingItem,
    Findings,
    Flag,
    PersonalFindings,
    RiskFindings,
    case_columns,
)


def test_valid_findings() -> None:
    findings = Findings(
        risk="high",
        evidence_status="partial",
        items=[FindingItem(text="Tracking is available", status="verified")],
        suggested_action="Confirm the delivery evidence",
        order_number="9KX20417LM553201A",
        buyer_name="Jordan Claims",
        amount="40.00",
        currency="USD",
    )

    assert findings.amount == "40.00"


def test_specialized_findings_are_valid() -> None:
    personal = PersonalFindings(
        risk="inconclusive",
        evidence_status="missing",
        reasons=["The payment details need review"],
        safe_steps=["Use PayPal's Resolution Center"],
        flags=[Flag(text="Unusual request", why="The request asks for direct contact")],
    )
    risk = RiskFindings(
        risk="medium",
        evidence_status="complete",
        reasons=["Several claims share a pattern"],
        actions=["sign", "confirm", "cancel"],
    )

    assert personal.flags is not None
    assert risk.actions == ["sign", "confirm", "cancel"]


def test_gaps_doc_example_is_not_the_s1_contract() -> None:
    legacy_example = {
        "case_summary": "Buyer says the parcel never arrived.",
        "risk_reasons": ["5 item-not-received claims in 90 days"],
        "evidence_supporting": [],
        "overall_assessment": "high_suspicion",
    }

    with pytest.raises(ValidationError):
        Findings.model_validate(legacy_example)


@pytest.mark.parametrize(
    "payload",
    [
        {"risk": "low", "evidence_status": "complete", "confidence": 0.9},
        {"risk": "low", "evidence_status": "complete", "probability": 0.9},
    ],
)
def test_extra_fields_are_rejected(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        Findings.model_validate(payload)


@pytest.mark.parametrize("text", ["fraud confirmed", "This is GUARANTEED"])
def test_verdict_phrases_are_rejected(text: str) -> None:
    with pytest.raises(ValidationError):
        FindingItem(text=text, status="unverified")


def test_case_columns_keep_risk_and_evidence_separate() -> None:
    assert case_columns(
        Findings(risk="inconclusive", evidence_status="partial")
    ) == {"risk_level": "inconclusive", "evidence_status": "partial"}


def test_findings_schema_is_up_to_date() -> None:
    schema_path = Path(__file__).parents[2] / "docs" / "findings.schema.json"
    expected = Findings.model_json_schema()
    actual = json.loads(schema_path.read_text(encoding="utf-8"))

    assert actual == expected
