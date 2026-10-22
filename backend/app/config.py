"""Application configuration.

Owner: Digant
Status: in progress
"""

from pathlib import Path
from urllib.parse import urlsplit

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )

    database_url: str = ""
    env: str = "local"
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    paypal_report_url: str = ""
    llm_api_key: str = ""
    frontend_origin: str = "http://localhost:5173"
    carrier_api_base_url: str = ""
    elastic_url: str = ""
    elastic_api_key: str = ""

    @property
    def frontend_origins(self) -> list[str]:
        """Return normalized frontend origins configured for CORS."""
        origins = [
            origin.strip().rstrip("/")
            for origin in self.frontend_origin.split(",")
            if origin.strip()
        ]
        return origins or ["http://localhost:5173"]

    @property
    def frontend_origins_are_localhost_only(self) -> bool:
        """Whether every configured frontend origin points to localhost."""
        return all(
            urlsplit(origin).hostname in {"localhost", "127.0.0.1", "::1"}
            for origin in self.frontend_origins
        )


settings = Settings()
