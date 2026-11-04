"""PayPal dispute wrapper tests.

Owner: Digant
Status: in progress
"""

import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from app.paypal.client import PayPalClient, PayPalError
from app.paypal.disputes import (
    ApprovalRequiredError,
    DisputeActionNotAllowedError,
    accept_claim,
    get_dispute,
    list_disputes,
    send_message,
)

FIXTURE = Path(__file__).parent / "fixtures" / "dispute.json"


def _client(handler: Any) -> PayPalClient:
    return PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )


@pytest.mark.anyio
async def test_get_dispute_parses_fixture() -> None:
    dispute_data = json.loads(FIXTURE.read_text())

    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(200, json=dispute_data)

    client = _client(handler)
    dispute = await get_dispute("PP-D-001", client)

    assert dispute.dispute_id == "PP-D-001"
    assert dispute.amount == "25.00"
    assert dispute.currency == "USD"
    assert dispute.seller_response_due_date == "2026-01-12T00:00:00Z"
    assert dispute.disputed_transactions[0].seller_transaction_id == "CAPTURE-1"
    assert dispute.messages[0].content == "Package was not received."
    assert dispute.evidences[0].evidence_type == "PROOF_OF_DELIVERY"
    assert dispute.allowed_response_options.permits("accept_claim")
    await client.aclose()


@pytest.mark.anyio
async def test_list_disputes_uses_summary_fields_and_filter() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        assert request.url.params["page_size"] == "5"
        assert request.url.params["dispute_state"] == "OPEN"
        return httpx.Response(
            200,
            json={
                "items": [
                    {
                        "dispute_id": "PP-D-001",
                        "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
                        "status": "OPEN",
                        "dispute_amount": {"currency_code": "USD", "value": "25.00"},
                        "create_time": "2026-01-02T03:04:05Z",
                        "update_time": "2026-01-03T03:04:05Z",
                    }
                ]
            },
        )

    client = _client(handler)
    disputes = await list_disputes("OPEN", page_size=5, client=client)

    assert disputes[0].dispute_id == "PP-D-001"
    assert disputes[0].dispute_amount.value == "25.00"
    await client.aclose()


@pytest.mark.anyio
async def test_write_refuses_without_approval() -> None:
    calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(500)

    client = _client(handler)
    with pytest.raises(ApprovalRequiredError, match="approver_id and case_id"):
        await accept_claim("PP-D-001", "approved note", client=client)
    assert calls == 0
    await client.aclose()


@pytest.mark.anyio
async def test_write_refuses_when_action_is_not_allowed() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        if request.method == "GET":
            data = json.loads(FIXTURE.read_text())
            data["allowed_response_options"] = {}
            return httpx.Response(200, json=data)
        pytest.fail("write request must not be sent")

    client = _client(handler)
    with pytest.raises(DisputeActionNotAllowedError, match="does not allow"):
        await send_message(
            "PP-D-001",
            "hello",
            approver_id="approver-1",
            case_id="case-1",
            client=client,
        )
    await client.aclose()


@pytest.mark.anyio
async def test_dispute_error_preserves_debug_id() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(
            404,
            headers={"PayPal-Debug-Id": "debug-dispute-1"},
            json={"message": "Dispute not found"},
        )

    client = _client(handler)
    with pytest.raises(PayPalError, match="Dispute not found") as exc_info:
        await get_dispute("missing", client)
    assert exc_info.value.status == 404
    assert exc_info.value.debug_id == "debug-dispute-1"
    await client.aclose()
