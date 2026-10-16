"""Merchant case routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("")
def list_cases() -> list[dict[str, str]]:
    # TODO: List merchant dispute cases.
    return []


@router.get("/{case_id}")
def get_case(case_id: str) -> dict[str, str]:
    # TODO: Return a merchant dispute case with evidence and risk details.
    return {"case_id": case_id, "status": "stub"}
