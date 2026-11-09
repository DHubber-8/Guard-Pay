"""FastAPI application entry point."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, settings
from app.mocks import carrier
from app.routes import approvals, auth, cases, order_help, personal, webhooks

logger = logging.getLogger(__name__)


def create_app(config: Settings = settings) -> FastAPI:
    """Create the API application with configured frontend origins."""
    if config.env.lower() == "production" and not config.session_secret:
        raise RuntimeError("SESSION_SECRET must be set when ENV=production")
    if config.env.lower() == "production" and config.frontend_origins_are_localhost_only:
        logger.warning(
            "FRONTEND_ORIGIN only contains localhost origins in production; "
            "configure the deployed frontend URL."
        )

    application = FastAPI(title="dispute-helper API")
    application.state.settings = config
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Authorization",
            "Content-Type",
            "Origin",
            "X-Requested-With",
        ],
    )

    @application.middleware("http")
    async def require_csrf_header(request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            is_paypal_webhook = request.url.path == "/webhooks/paypal"
            is_login = request.url.path == "/auth/login"
            if (
                not is_paypal_webhook
                and not is_login
                and not request.headers.get("X-Requested-With")
            ):
                return JSONResponse(status_code=403, content={"detail": "CSRF header required"})
        return await call_next(request)

    application.include_router(auth.router)
    application.include_router(webhooks.router)
    application.include_router(order_help.router)
    application.include_router(cases.router)
    application.include_router(approvals.router)
    application.include_router(personal.router)
    application.include_router(carrier.router)
    return application


app = create_app()


@app.get("/health")
def health() -> dict[str, str]:
    """Return service health."""
    # TODO: Add dependency health checks.
    return {"status": "ok"}
