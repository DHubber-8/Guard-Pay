"""FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, settings
from app.routes import approvals, cases, order_help, personal, webhooks

logger = logging.getLogger(__name__)


def create_app(config: Settings = settings) -> FastAPI:
    """Create the API application with configured frontend origins."""
    if config.env.lower() == "production" and config.frontend_origins_are_localhost_only:
        logger.warning(
            "FRONTEND_ORIGIN only contains localhost origins in production; "
            "configure the deployed frontend URL."
        )

    application = FastAPI(title="dispute-helper API")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Authorization", "Content-Type", "Origin"],
    )

    application.include_router(webhooks.router)
    application.include_router(order_help.router)
    application.include_router(cases.router)
    application.include_router(approvals.router)
    application.include_router(personal.router)
    return application


app = create_app()


@app.get("/health")
def health() -> dict[str, str]:
    """Return service health."""
    # TODO: Add dependency health checks.
    return {"status": "ok"}
