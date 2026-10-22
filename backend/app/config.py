"""Application configuration.

Owner: Digant
Status: in progress
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )

    database_url: str = ""
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_base_url: str = "https://api-m.sandbox.paypal.com"
    paypal_report_url: str = ""
    llm_api_key: str = ""
    frontend_origin: str = ""
    carrier_api_base_url: str = ""
    elastic_url: str = ""
    elastic_api_key: str = ""


settings = Settings()
