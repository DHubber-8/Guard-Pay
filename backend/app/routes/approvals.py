"""Merchant approval routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/cases", tags=["approvals"])


@router.post("/{case_id}/approve")
def approve_case(case_id: str) -> dict[str, str]:
    # TODO: Approve the recommended merchant resolution.
    return {"case_id": case_id, "decision": "approve", "status": "stub"}


@router.post("/{case_id}/decline")
def decline_case(case_id: str) -> dict[str, str]:
    # TODO: Decline the recommended merchant resolution.
    return {"case_id": case_id, "decision": "decline", "status": "stub"}
