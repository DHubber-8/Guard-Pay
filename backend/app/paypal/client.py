"""PayPal HTTP client.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PayPalError(RuntimeError):
    """An error returned by PayPal or raised while obtaining an access token."""

    def __init__(self, status: int, debug_id: str | None, message: str) -> None:
        self.status = status
        self.debug_id = debug_id
        self.message = message
        debug_suffix = f", debug_id={debug_id}" if debug_id else ""
        super().__init__(f"PayPal request failed (status={status}{debug_suffix}): {message}")


class PayPalClient:
    """Async PayPal REST client with cached client-credentials authentication."""

    def __init__(
        self,
        base_url: str | None = None,
        client_id: str | None = None,
        client_secret: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.base_url = (base_url or settings.paypal_base_url).rstrip("/")
        self.client_id = client_id if client_id is not None else settings.paypal_client_id
        self.client_secret = (
            client_secret if client_secret is not None else settings.paypal_client_secret
        )
        self.client = http_client or httpx.AsyncClient(
            base_url=self.base_url,
            transport=transport,
        )
        self._access_token: str | None = None
        self._token_expires_at = 0.0

    async def fetch_oauth_token(self, force_refresh: bool = False) -> str:
        """Get a cached access token, refreshing it shortly before expiration."""
        if (
            not force_refresh
            and self._access_token
            and time.monotonic() < self._token_expires_at
        ):
            return self._access_token

        response = await self.client.post(
            "/v1/oauth2/token",
            auth=(self.client_id, self.client_secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
        )
        if response.headers.get("PayPal-Debug-Id"):
            logger.info("PayPal-Debug-Id: %s", response.headers["PayPal-Debug-Id"])
        if response.is_error:
            raise self._error_from_response(response)
        try:
            payload = response.json()
            token = payload["access_token"]
            expires_in = float(payload["expires_in"])
        except (KeyError, TypeError, ValueError) as exc:
            raise PayPalError(
                response.status_code,
                response.headers.get("PayPal-Debug-Id"),
                "PayPal returned an invalid OAuth token response",
            ) from exc

        self._access_token = token
        self._token_expires_at = time.monotonic() + max(0.0, expires_in - 60)
        return token

    async def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        """Make an authenticated request and retry once if the token is rejected."""
        token = await self.fetch_oauth_token()
        headers = dict(kwargs.pop("headers", {}) or {})
        headers["Authorization"] = "Bearer " + token
        response = await self.client.request(method, path, headers=headers, **kwargs)
        if response.status_code == 401:
            token = await self.fetch_oauth_token(force_refresh=True)
            headers["Authorization"] = "Bearer " + token
            response = await self.client.request(method, path, headers=headers, **kwargs)
        if response.headers.get("PayPal-Debug-Id"):
            logger.info("PayPal-Debug-Id: %s", response.headers["PayPal-Debug-Id"])
        if response.is_error:
            raise self._error_from_response(response)
        return response

    @staticmethod
    def _error_from_response(response: httpx.Response) -> PayPalError:
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        message = payload.get("message") or payload.get("error_description") or response.text
        return PayPalError(
            response.status_code,
            response.headers.get("PayPal-Debug-Id"),
            message or "PayPal returned an error",
        )

    async def aclose(self) -> None:
        await self.client.aclose()
