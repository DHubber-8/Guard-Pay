"""FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.session import SessionLocal, get_db
from app.mocks import carrier
from app.paypal.client import PayPalClient
from app.routes import (
    admin,
    approvals,
    auth,
    cases,
    order_help,
    personal,
    shipments,
    webhooks,
)
from app.workers.delivery_watch import run_once

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

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        paypal_client = PayPalClient(
            base_url=config.paypal_base_url,
            client_id=config.paypal_client_id,
            client_secret=config.paypal_client_secret,
        )
        application.state.paypal_client = paypal_client
        worker_task: asyncio.Task[None] | None = None
        if config.workers_enabled:
            async def worker_loop() -> None:
                while True:
                    await asyncio.to_thread(_run_delivery_watch_once)
                    await asyncio.sleep(config.workers_interval_seconds)

            worker_task = asyncio.create_task(worker_loop())
        try:
            yield
        finally:
            if worker_task is not None:
                worker_task.cancel()
                await asyncio.gather(worker_task, return_exceptions=True)
            await paypal_client.aclose()

    def _run_delivery_watch_once() -> None:
        with SessionLocal() as db:
            run_once(db, config)

    application = FastAPI(title="dispute-helper API", lifespan=lifespan)
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
    application.include_router(admin.router)
    application.include_router(webhooks.router)
    application.include_router(order_help.router)
    application.include_router(cases.router)
    application.include_router(approvals.router)
    application.include_router(personal.router)
    application.include_router(shipments.router)
    application.include_router(carrier.router)

    @application.get("/health")
    def health() -> dict[str, str]:
        """Return service liveness."""
        return {"status": "ok"}

    @application.get("/health/ready", response_model=None)
    def readiness(db: Session = Depends(get_db)) -> dict[str, str] | JSONResponse:
        """Check database readiness without changing the liveness endpoint."""
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as exc:
            logger.error("Readiness database check failed: %s", exc)
            return JSONResponse(status_code=503, content={"status": "unready"})
        return {"status": "ready"}

    return application


app = create_app()
