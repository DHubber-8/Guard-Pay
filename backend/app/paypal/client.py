"""PayPal HTTP client."""

import httpx


class PayPalClient:
    """Minimal PayPal API client placeholder."""

    def __init__(self, base_url: str) -> None:
        # TODO: Configure authentication and reusable HTTP transport.
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url)

    async def fetch_oauth_token(self) -> str:
        # TODO: Fetch and cache a PayPal OAuth access token.
        return ""
