"""Merchant response drafting agent."""


"""B7: Human-reviewed merchant response draft. Never submit automatically."""
def draft_response(case_id: str, *, scenario_label: str = "dispute", evidence: dict = None) -> str:
    evidence = evidence or {}
    verified = [k.replace("_", " ") for k, v in evidence.items() if isinstance(v, dict) and v.get("verified") is True]
    return (f"Draft response for case {case_id} ({scenario_label}).\n"
            "We request a review of this dispute based on the attached records.\n"
            + ("Verified supporting records: " + ", ".join(verified) + ".\n" if verified else "Supporting documents must be verified and attached before submission.\n")
            + "Please review all statements and attachments before submitting. [HUMAN APPROVAL REQUIRED]")

