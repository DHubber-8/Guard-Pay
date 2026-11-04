"""PayPal Disputes API operations.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import asyncio
import sys
from collections.abc import Mapping
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.paypal.client import PayPalClient


class DisputeMoney(BaseModel):
    model_config = ConfigDict(extra="ignore")

    currency_code: str | None = None
    value: str | None = None


class DisputedTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")

    buyer_transaction_id: str | None = None
    seller_transaction_id: str | None = None
    reference_id: str | None = None
    create_time: str | None = None
    transaction_status: str | None = None
    gross_amount: DisputeMoney | None = None


class DisputeMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    posted_by: str | None = None
    time_posted: str | None = None
    content: str | None = None


class DisputeEvidence(BaseModel):
    model_config = ConfigDict(extra="ignore")

    evidence_type: str | None = None
    notes: str | None = None
    source: str | None = None
    date: str | None = None
    item_id: str | None = None
    item_type: str | None = None


class AllowedResponseOptions(BaseModel):
    model_config = ConfigDict(extra="allow")

    accept_claim: dict[str, Any] | None = None
    acknowledge_return_item: dict[str, Any] | None = None
    make_offer: dict[str, Any] | None = None

    def permits(self, action: str) -> bool:
        option = getattr(self, action, None)
        if option is not None:
            return True
        return action in (self.model_extra or {})


class Dispute(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dispute_id: str
    reason: str | None = None
    status: str | None = None
    dispute_amount: DisputeMoney | None = None
    create_time: str | None = None
    update_time: str | None = None
    buyer_response_due_date: str | None = None
    seller_response_due_date: str | None = None
    disputed_transactions: list[DisputedTransaction] = Field(default_factory=list)
    messages: list[DisputeMessage] = Field(default_factory=list)
    evidences: list[DisputeEvidence] = Field(default_factory=list)
    allowed_response_options: AllowedResponseOptions = Field(
        default_factory=AllowedResponseOptions
    )
    links: list[dict[str, Any]] = Field(default_factory=list)

    @property
    def amount(self) -> str | None:
        return self.dispute_amount.value if self.dispute_amount else None

    @property
    def currency(self) -> str | None:
        return self.dispute_amount.currency_code if self.dispute_amount else None

    @property
    def response_due_date(self) -> str | None:
        return self.seller_response_due_date or self.buyer_response_due_date


class DisputeSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    dispute_id: str
    reason: str | None = None
    status: str | None = None
    dispute_state: str | None = None
    dispute_amount: DisputeMoney | None = None
    create_time: str | None = None
    update_time: str | None = None


class DisputeActionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    links: list[dict[str, Any]] = Field(default_factory=list)


class ApprovalRequiredError(ValueError):
    """Raised when a money-affecting action lacks explicit human approval."""


class DisputeActionNotAllowedError(ValueError):
    """Raised when PayPal does not report an action as available."""


def _require_approval(approver_id: str | None, case_id: str | None) -> None:
    if not approver_id or not case_id:
        raise ApprovalRequiredError(
            "Explicit approval is required: provide both approver_id and case_id."
        )


def _require_allowed(dispute: Dispute, action: str) -> None:
    has_action_link = any(
        link.get("rel") in {action, action.replace("_", "-")}
        for link in dispute.links
    )
    if not dispute.allowed_response_options.permits(action) and not has_action_link:
        raise DisputeActionNotAllowedError(
            f"PayPal does not allow '{action}' for dispute {dispute.dispute_id}."
        )


def _summary(data: Mapping[str, Any]) -> DisputeSummary:
    return DisputeSummary.model_validate(data)


async def get_dispute(dispute_id: str, client: PayPalClient | None = None) -> Dispute:
    """Fetch and parse one PayPal customer dispute."""
    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        response = await paypal.request("GET", f"/v1/customer/disputes/{dispute_id}")
        return Dispute.model_validate(response.json())
    finally:
        if owned_client:
            await paypal.aclose()


async def list_disputes(
    status: str | None = None,
    page_size: int = 20,
    client: PayPalClient | None = None,
) -> list[DisputeSummary]:
    """List PayPal disputes using the API's summary response."""
    if page_size < 1:
        raise ValueError("page_size must be at least 1")
    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        params: dict[str, str | int] = {"page_size": page_size}
        if status is not None:
            params["dispute_state"] = status
        response = await paypal.request("GET", "/v1/customer/disputes", params=params)
        return [_summary(item) for item in response.json().get("items", [])]
    finally:
        if owned_client:
            await paypal.aclose()


async def _write_action(
    dispute_id: str,
    action: str,
    payload: Mapping[str, Any],
    approver_id: str | None,
    case_id: str | None,
    client: PayPalClient | None,
) -> DisputeActionResult:
    _require_approval(approver_id, case_id)
    owned_client = client is None
    paypal = client or PayPalClient()
    try:
        dispute = await get_dispute(dispute_id, paypal)
        _require_allowed(dispute, action)
        response = await paypal.request(
            "POST",
            f"/v1/customer/disputes/{dispute_id}/{action.replace('_', '-')}",
            json=dict(payload),
        )
        return DisputeActionResult.model_validate(response.json() if response.content else {})
    finally:
        if owned_client:
            await paypal.aclose()


async def accept_claim(
    dispute_id: str,
    note: str,
    *,
    approver_id: str | None = None,
    case_id: str | None = None,
    client: PayPalClient | None = None,
) -> DisputeActionResult:
    """Accept a claim only after explicit approval and PayPal eligibility."""
    return await _write_action(
        dispute_id, "accept_claim", {"note": note}, approver_id, case_id, client
    )


async def provide_evidence(
    dispute_id: str,
    evidence: Mapping[str, Any],
    *,
    approver_id: str | None = None,
    case_id: str | None = None,
    client: PayPalClient | None = None,
) -> DisputeActionResult:
    """Submit evidence only after explicit approval and PayPal eligibility."""
    return await _write_action(
        dispute_id, "provide_evidence", evidence, approver_id, case_id, client
    )


async def send_message(
    dispute_id: str,
    message: str,
    *,
    approver_id: str | None = None,
    case_id: str | None = None,
    client: PayPalClient | None = None,
) -> DisputeActionResult:
    """Send a dispute message only after explicit approval and eligibility."""
    return await _write_action(
        dispute_id, "send_message", {"message": message}, approver_id, case_id, client
    )


async def _main(dispute_id: str) -> None:
    dispute = await get_dispute(dispute_id)
    print(dispute.model_dump_json(indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.paypal.disputes <DISPUTE_ID>")
    asyncio.run(_main(sys.argv[1]))
