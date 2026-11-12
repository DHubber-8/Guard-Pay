"""Assessment rules."""
# Task: B5 | Area: B | Owner: TBD | Status: not started
# TODO: Combine risk and evidence status without producing verdicts.


"""B5: Combine findings without confusing missing evidence with fraud."""

def assess_case(evidence_result: dict, risk_result: dict) -> dict:
    return {"risk_level": risk_result["level"], "risk_score": risk_result["score"],
            "evidence_status": evidence_result["status"],
            "needs_review": risk_result["level"] in ("medium", "high", "inconclusive") or evidence_result["status"] != "complete",
            "summary": ("Human review recommended. " if risk_result["level"] != "low" else "Review evidence before acting. ")
                       + f"Evidence status: {evidence_result['status']}."}