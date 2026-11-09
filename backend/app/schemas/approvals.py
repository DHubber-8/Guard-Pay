"""Approval request and response schemas."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, StringConstraints
from typing_extensions import Annotated


class ApprovalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offer: Literal["partial", "full", "replace"]
    amount: Annotated[str | None, StringConstraints(pattern=r"^\d+\.\d{2}$")] = None
    message: str | None = None


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: int
    decision: Literal["approve", "decline"]
    status: str
    refund_id: str | None = None
