"""Conservative keyword-based personal Scam Check analyzer."""

from __future__ import annotations

from app.schemas.findings import PersonalFindings


def analyze_personal_check(
    description: str, link_or_sender: str, answers: list[str]
) -> PersonalFindings:
    """Return decision support without making a fraud determination."""
    text = " ".join([description, link_or_sender, *answers]).casefold()
    reasons: list[str] = []
    risk = "inconclusive"
    evidence_status = "partial" if answers else "missing"

    if any(term in text for term in ("password", "one-time code", "otp", "verification code")):
        reasons.append(
            "The message asks for sensitive sign-in information, which could be a scam warning sign."
        )
        risk = "high"
    if any(term in text for term in ("urgent", "immediately", "gift card", "crypto", "wire transfer")):
        reasons.append(
            "Urgent language or unusual payment requests could indicate increased risk."
        )
        risk = "high" if risk == "inconclusive" else risk
    if not reasons:
        reasons.append(
            "The available details do not establish whether this is safe or harmful."
        )

    return PersonalFindings(
        risk=risk,
        evidence_status=evidence_status,
        reasons=reasons,
        safe_steps=[
            "Never share passwords, one-time codes, or recovery codes.",
            "Verify the sender using a trusted contact method before taking action.",
            "Avoid clicking links or sending money until the request is independently confirmed.",
        ],
    )
