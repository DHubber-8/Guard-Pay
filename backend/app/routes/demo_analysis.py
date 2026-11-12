"""Demo-only endpoint for synthetic dispute analysis."""

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.pipeline import analyze_case
from app.rules.scenarios import get_scenario
from app.rules.indicator_detector import detect_indicators

router = APIRouter(prefix="/demo", tags=["demo"])


class DemoAnalysisRequest(BaseModel):
    scenario_id: str
    case_id: str = "UNASSIGNED"
    evidence: dict[str, Any] = Field(default_factory=dict)
    triggered_indicators: list[str] = Field(default_factory=list)


@router.post("/analyze")
def analyze_demo(request: Request, payload: DemoAnalysisRequest):
    config = getattr(request.app.state, "settings", settings)

    if config.env.lower() == "production" or not config.demo_mode:
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )

    if (
        not payload.scenario_id
        or len(payload.case_id) > 100
        or len(payload.evidence) > 30
        or len(payload.triggered_indicators) > 30
    ):
        raise HTTPException(
            status_code=422,
            detail="Invalid demo data",
        )

    scenario = get_scenario(payload.scenario_id)

    if not scenario:
        raise HTTPException(
            status_code=422,
            detail="Unknown scenario",
        )

    # Derive the correct mode from the scenario catalog.
    mode = scenario["mode"]

    # Only accept indicators defined for this scenario.
    valid_ids = {
        indicator["id"]
        for indicator in scenario["suspicious_indicators"]
    }

    indicators = list(
        dict.fromkeys(payload.triggered_indicators)
    )

    if any(
        indicator not in valid_ids
        for indicator in indicators
    ):
        raise HTTPException(
            status_code=422,
            detail="Invalid indicator for scenario",
        )
    # Automatically detect indicators from structured evidence.
    detected_indicators = detect_indicators(
    payload.scenario_id,
    payload.evidence,
)
    try:
        result = analyze_case(
            {
                "case_id": payload.case_id,
                "mode": mode,
                "scenario_id": payload.scenario_id,
                "evidence": payload.evidence,
                "triggered_indicators": detected_indicators,
            },
            use_ai=False,
        )

    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Invalid analysis input",
        )

    return result