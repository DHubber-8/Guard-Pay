"""PayPal refund and tracking wrapper tests.

Owner: Digant
Status: in progress
"""

import json
from typing import Any

import httpx
import pytest

from app.paypal.client import PayPalClient, PayPalError
from app.paypal.disputes import ApprovalRequiredError
from app.paypal.refunds import RefundNotAllowedError, get_capture, refund_capture
from app.paypal.tracking import add_tracking, get_tracking


def _client(handler: Any) -> PayPalClient:
    return PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=httpx.MockTransport(handler),
    )


def _capture(status: str = "COMPLETED", refunded: str | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": "CAPTURE-1",
        "status": status,
        "amount": {"currency_code": "USD", "value": "10.00"},
    }
    if refunded is not None:
        data["refunded_amount"] = refunded
    return data


@pytest.mark.anyio
async def test_refund_refuses_without_approval() -> None:
    calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(500)

    client = _client(handler)
    with pytest.raises(ApprovalRequiredError, match="approver_id and case_id"):
        await refund_capture("CAPTURE-1", client=client)
    assert calls == 0
    await client.aclose()


@pytest.mark.anyio
async def test_refund_refuses_amount_above_remaining() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(200, json=_capture(refunded="7.00"))

    client = _client(handler)
    with pytest.raises(RefundNotAllowedError, match="remaining refundable amount"):
        await refund_capture(
            "CAPTURE-1", "4.00", approver_id="approver-1", case_id="case-1", client=client
        )
    await client.aclose()


@pytest.mark.anyio
async def test_full_and_partial_refund_request_bodies_and_idempotency() -> None:
    requests: list[httpx.Request] = []
    refund_count = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal refund_count
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(200, json=_capture(refunded="2.00"))
        refund_count += 1
        return httpx.Response(201, json={"id": f"REFUND-{refund_count}", "status": "COMPLETED"})

    client = _client(handler)
    full = await refund_capture(
        "CAPTURE-1", approver_id="approver-1", case_id="case-1", client=client
    )
    partial = await refund_capture(
        "CAPTURE-1",
        "1.25",
        "USD",
        "partial note",
        approver_id="approver-1",
        case_id="case-1",
        client=client,
    )
    repeated = await refund_capture(
        "CAPTURE-1",
        "1.25",
        "USD",
        "partial note",
        approver_id="approver-1",
        case_id="case-1",
        client=client,
    )
    assert full.refund_id == "REFUND-1"
    assert partial.refund_id == "REFUND-2"
    assert repeated.refund_id == "REFUND-3"
    assert json.loads(requests[1].content) == {}
    assert json.loads(requests[3].content) == {
        "amount": {"value": "1.25", "currency_code": "USD"},
        "note_to_payer": "partial note",
    }
    assert requests[3].headers["PayPal-Request-Id"] == requests[5].headers["PayPal-Request-Id"]
    await client.aclose()


@pytest.mark.anyio
async def test_add_tracking_body_and_refuses_without_actor() -> None:
    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(200, json={})

    client = _client(handler)
    with pytest.raises(ApprovalRequiredError, match="actor_id and case_id"):
        await add_tracking("ORDER-1", "CAPTURE-1", "TRACK-1", "UPS", client=client)
    assert len(requests) == 0
    result = await add_tracking(
        "ORDER-1",
        "CAPTURE-1",
        "TRACK-1",
        "UPS",
        notify_payer=True,
        actor_id="actor-1",
        case_id="case-1",
        client=client,
    )
    assert result.order_id == "ORDER-1"
    assert json.loads(requests[-1].content) == {
        "capture_id": "CAPTURE-1",
        "tracking_number": "TRACK-1",
        "carrier": "UPS",
        "notify_payer": True,
    }
    await client.aclose()


@pytest.mark.anyio
async def test_tracking_readback_uses_order_wrapper() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(
            200,
            json={
                "id": "ORDER-1",
                "status": "COMPLETED",
                "purchase_units": [{"trackers": [{"tracking_number": "TRACK-1"}]}],
            },
        )

    client = _client(handler)
    order = await get_tracking("ORDER-1", client)
    assert order.tracking == [{"tracking_number": "TRACK-1"}]
    await client.aclose()


@pytest.mark.anyio
async def test_refund_error_preserves_debug_id() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(
            404,
            headers={"PayPal-Debug-Id": "debug-refund-1"},
            json={"message": "Capture not found"},
        )

    client = _client(handler)
    with pytest.raises(PayPalError, match="Capture not found") as exc_info:
        await get_capture("missing", client)
    assert exc_info.value.debug_id == "debug-refund-1"
    await client.aclose()
