"""B4: Heuristic score, NOT a fraud probability or verdict."""
from app.rules.scenarios import get_scenario

WEIGHTS = {"potential_fraud_indicator": 25, "evidence_inconsistency": 10,
           "evidence_gap": 0, "merchant_side_issue": 0}

def assess_risk(scenario_id: str, triggered_indicators: list[str]) -> dict:
    scenario = get_scenario(scenario_id)
    if scenario is None:
        raise ValueError("Unknown scenario")
    index = {i["id"]: i for i in scenario["suspicious_indicators"]}
    unknown = set(triggered_indicators) - set(index)
    if unknown:
        raise ValueError("Unknown indicator IDs: " + ", ".join(sorted(unknown)))
    found = [index[i] for i in dict.fromkeys(triggered_indicators)]
    score = min(100, sum(WEIGHTS[i["type"]] for i in found))
    level = "inconclusive" if not found else "high" if score >= 60 else "medium" if score >= 25 else "low"
    return {"score": score, "level": level, "indicators": found,
            "caveat": "Heuristic warning score only; not a calibrated probability of fraud."}

def buyer_risk_level(history: list[dict[str, str]]) -> str:
    # A buyer's merchant-side history alone cannot establish fraud.
    return "inconclusive"