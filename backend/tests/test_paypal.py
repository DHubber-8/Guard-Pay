"""PayPal client and order tests.

Owner: Digant
Status: in progress
"""

import httpx
import pytest

from app.paypal.client import PayPalClient, PayPalError
from app.paypal.orders import get_order


def paypal_transport(handler):
    return httpx.MockTransport(handler)


@pytest.mark.anyio
async def test_token_fetch_is_cached() -> None:
    calls = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})

    client = PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=paypal_transport(handler),
    )
    assert await client.fetch_oauth_token() == "token"
    assert await client.fetch_oauth_token() == "token"
    assert len(calls) == 1
    await client.aclose()


@pytest.mark.anyio
async def test_401_refreshes_and_retries() -> None:
    token_calls = 0
    api_calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal token_calls, api_calls
        if request.url.path.endswith("/oauth2/token"):
            token_calls += 1
            return httpx.Response(
                200, json={"access_token": f"token-{token_calls}", "expires_in": 3600}
            )
        api_calls += 1
        assert request.headers["Authorization"] == f"Bearer token-{api_calls}"
        if api_calls == 1:
            return httpx.Response(401)
        return httpx.Response(200, json={"ok": True})

    client = PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=paypal_transport(handler),
    )
    response = await client.request("GET", "/v2/checkout/orders/123")
    assert response.json() == {"ok": True}
    assert token_calls == 2
    assert api_calls == 2
    await client.aclose()


@pytest.mark.anyio
async def test_error_maps_status_debug_id_and_message() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(
            422,
            headers={"PayPal-Debug-Id": "debug-123"},
            json={"message": "Invalid order"},
        )

    client = PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=paypal_transport(handler),
    )
    with pytest.raises(PayPalError, match="Invalid order") as exc_info:
        await client.request("GET", "/v2/checkout/orders/bad")
    assert exc_info.value.status == 422
    assert exc_info.value.debug_id == "debug-123"
    await client.aclose()


@pytest.mark.anyio
async def test_get_order_parses_documented_fields() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/oauth2/token"):
            return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
        return httpx.Response(
            200,
            json={
                "id": "5O190127TN364715T",
                "status": "COMPLETED",
                "payer": {
                    "name": {"given_name": "Jane", "surname": "Doe"},
                    "email_address": "jane@example.test",
                },
                "purchase_units": [
                    {
                        "amount": {"currency_code": "USD", "value": "10.00"},
                        "shipping": {"name": {"full_name": "Jane Doe"}},
                        "payments": {"captures": [{"id": "CAPTURE-1"}]},
                    }
                ],
            },
        )

    client = PayPalClient(
        base_url="https://sandbox.test",
        client_id="id",
        client_secret="secret",
        transport=paypal_transport(handler),
    )
    order = await get_order("5O190127TN364715T", client)
    assert order.id == "5O190127TN364715T"
    assert order.status == "COMPLETED"
    assert order.amount == "10.00"
    assert order.currency == "USD"
    assert order.payer_email == "jane@example.test"
    assert order.capture_ids == ["CAPTURE-1"]
    assert order.shipping == {"name": {"full_name": "Jane Doe"}}
    await client.aclose()
