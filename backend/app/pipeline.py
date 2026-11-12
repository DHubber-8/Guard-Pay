"""Shared analysis pipeline."""
# Task: B8 | Area: B | Owner: SJ | Status: DONE
# TODO: Wire classification, evidence, risk, and assessment steps together.


#"""B8: One integration entrypoint for Role A and Role C."""
from __future__ import annotations
from app.agents.classifier import classify_dispute
from app.agents.explainer import explain_findings
from app.agents.personal_advisor import personal_advice
from app.agents.drafter import draft_response
from app.rules.scenarios import get_scenario
from app.rules.evidence import analyze_evidence
from app.rules.risk import assess_risk
from app.rules.assessment import assess_case
from app.schemas.findings import Findings, FindingItem, PersonalFindings

def analyze_case(case_data: dict, *, use_ai: bool = False) -> dict:
    """Pure analysis: never contacts PayPal, changes DB, or submits decisions.

    Input: {mode, description, scenario_id?, evidence?: {key:value}, triggered_indicators?: [id], case_id?}
    Indicators MUST come from evaluated facts; untrusted user assertions are not verified.
    """
    mode = case_data.get("mode", "merchant")
    if mode not in ("merchant", "personal"):
        raise ValueError("mode must be merchant or personal")
    scenario_id = classify_dispute(case_data.get("description", ""), mode, case_data.get("scenario_id"))
    if scenario_id == "unknown":
        return {"scenario_id": None, "mode": mode, "risk_score": 0, "risk": "inconclusive",
                "evidence_status": "missing", "explanation": "Not enough information to identify a scenario.",
                "needs_review": True, "human_approval_required": True, "findings": None}
    scenario = get_scenario(scenario_id)
    supplied = case_data.get("evidence") or {}
    if not isinstance(supplied, dict):
        raise ValueError("evidence must be a dictionary")
    evidence = analyze_evidence(scenario_id, supplied)
    risk = assess_risk(scenario_id, case_data.get("triggered_indicators") or [])
    assessment = assess_case(evidence, risk)
    explanation = explain_findings(scenario, evidence, risk)
    if use_ai:
        from app.agents.ai_gateway import enhance_explanation
        # Only a summary of indicator names / missing field names is sent; no raw case records.
        explanation = enhance_explanation(explanation) or explanation
    items = [FindingItem(text=i["name"].replace("_", " "), status="unverified",
                         detail=i["description"]) for i in risk["indicators"]]
    items += [FindingItem(text="Missing " + k.replace("_", " "), status="missing") for k in evidence["missing"]]
    if mode == "personal":
        findings = PersonalFindings(risk=risk["level"], evidence_status=evidence["status"],
                                    items=items, reasons=[explanation], safe_steps=personal_advice(scenario_id),
                                    suggested_action="Verify independently before proceeding")
    else:
        findings = Findings(risk=risk["level"], evidence_status=evidence["status"],
                            items=items, suggested_action="Review evidence and approve any response manually")
    result = {"scenario_id": scenario_id, "mode": mode, "risk_score": risk["score"],
              "risk": risk["level"], "evidence_status": evidence["status"],
              "evidence": evidence, "indicators": risk["indicators"], "explanation": explanation,
              "needs_review": assessment["needs_review"], "human_approval_required": True,
              "findings": findings.model_dump(), "score_caveat": risk["caveat"]}
    if mode == "merchant":
        result["draft_response"] = draft_response(str(case_data.get("case_id", "UNASSIGNED")),
                                                   scenario_label=scenario["label"], evidence=supplied)
    return result
