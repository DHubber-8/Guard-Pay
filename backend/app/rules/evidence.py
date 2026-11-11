"""B3: Evidence availability is separate from fraud risk."""
from app.rules.scenarios import get_scenario

def analyze_evidence(scenario_id: str, evidence: dict) -> dict:
    scenario = get_scenario(scenario_id)
    if scenario is None:
        raise ValueError("Unknown scenario")
    required = scenario["required_evidence"]
    present = [key for key in required if evidence.get(key) not in (None, "", [], {})]
    missing = [key for key in required if key not in present]
    optional = [key for key in scenario["conditional_evidence"] if evidence.get(key) not in (None, "", [], {})]
    ratio = len(present) / len(required) if required else 1.0
    return {"present": present, "missing": missing, "conditional_present": optional,
            "completeness": round(ratio, 3),
            "status": "complete" if ratio == 1 else "missing" if ratio == 0 else "partial"}

def evidence_completeness(dispute_type: str, evidence: list[str]) -> float:
    return analyze_evidence(dispute_type, {key: True for key in evidence})["completeness"]
