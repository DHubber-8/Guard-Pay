"""Buyer-facing explanation agent."""


"""B2: Fact-grounded explanation; optional AI enhancement in gateway module."""
def explain_dispute(evidence: list[str]) -> str:
    return "Available evidence: " + (", ".join(evidence) if evidence else "none supplied") + ". Verify records before making a decision."

def explain_findings(scenario: dict, evidence: dict, risk: dict) -> str:
    flags = ", ".join(i["name"].replace("_", " ") for i in risk["indicators"])
    return (f"{scenario['label']}: " + (f"Review these reported warning signs: {flags}. " if flags else "No verified warning signs were provided. ")
            + ("Missing evidence: " + ", ".join(evidence["missing"]) + ". " if evidence["missing"] else "Required evidence fields are present. ")
            + "This is not a fraud determination.")

