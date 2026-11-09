"""Personal suspicious-payment routes."""
# Task: A6 | Area: A | Owner: TBD | Status: not started
# TODO: Add routes for personal payment checks and findings.

from fastapi import APIRouter, Depends

from app.auth import require_user

router = APIRouter(prefix="/personal", tags=["personal"], dependencies=[Depends(require_user())])
