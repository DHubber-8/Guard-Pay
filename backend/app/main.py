"""FastAPI application entry point."""

import asyncio
import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.session import SessionLocal, get_db
from app import devlogs
from app.mocks import carrier
from app.paypal.client import PayPalClient
from app.routes import (
    admin,
    approvals,
    auth,
    cases,
    dev,
    console,
    order_help,
    personal,
    shipments,
    webhooks,
)
from app.workers.delivery_watch import run_once

logger = logging.getLogger(__name__)


def _configure_logging(config: Settings) -> None:
    class SingleLineFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            return super().format(record).replace("\r", "\\r").replace("\n", "\\n")

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    if not any(getattr(handler, "_dispute_helper_stdout", False) for handler in root.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler._dispute_helper_stdout = True
        handler.setFormatter(SingleLineFormatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        root.addHandler(handler)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    class DevLogHandler(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            if getattr(record, "_devlog_handler", False):
                return
            config = getattr(self, "_devlog_config", settings)
            allowed = record.levelno >= logging.WARNING or (
                record.levelno >= logging.INFO
                and (record.name.startswith("app.routes.webhooks") or record.name.startswith("app.paypal"))
            )
            if not allowed or not config.dev_logs_enabled:
                return
            try:
                devlogs.record(
                    "app",
                    request_id=devlogs.current_request_id(),
                    level=record.levelname,
                    message=self.format(record),
                    meta={"logger": record.name},
                )
            except Exception:
                return

    existing_dev_handler = next(
        (handler for handler in root.handlers if getattr(handler, "_dispute_helper_devlog", False)),
        None,
    )
    if existing_dev_handler is not None:
        existing_dev_handler._devlog_config = config
    else:
        handler = DevLogHandler()
        handler._dispute_helper_devlog = True
        handler._devlog_config = config
        handler.setFormatter(logging.Formatter("%(message)s"))
        root.addHandler(handler)


def create_app(config: Settings = settings) -> FastAPI:
    """Create the API application with configured frontend origins."""
    if config.env.lower() == "production" and not config.session_secret:
        raise RuntimeError("SESSION_SECRET must be set when ENV=production")
    if config.demo_mode and config.env.lower() == "production" and config.paypal_client_id:
        logger.error(
            "DEMO_MODE cannot be enabled in production when PAYPAL_CLIENT_ID is configured"
        )
        raise RuntimeError(
            "DEMO_MODE cannot be enabled in production with PAYPAL_CLIENT_ID"
        )
    if config.env.lower() == "production" and config.frontend_origins_are_localhost_only:
        logger.warning(
            "FRONTEND_ORIGIN only contains localhost origins in production; "
            "configure the deployed frontend URL."
        )

    _configure_logging(config)
    devlogs.configure(config)

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

    @application.middleware("http")
    async def record_request(request: Request, call_next):
        path = request.url.path
        skip = path in {"/health", "/health/ready"} or path.startswith("/dev")
        request_id = uuid.uuid4().hex[:12]
        token = devlogs.request_id_var.set(request_id)
        started = time.perf_counter()
        response = None
        try:
            response = await call_next(request)
            response.headers["X-Request-Id"] = request_id
            return response
        finally:
            if not skip:
                devlogs.record(
                    "request",
                    request_id=request_id,
                    method=request.method,
                    path=path,
                    status=response.status_code if response is not None else 500,
                    duration_ms=(time.perf_counter() - started) * 1000,
                )
            devlogs.request_id_var.reset(token)

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
            "X-Admin-Token",
        ],
    )

    application.include_router(auth.router)
    application.include_router(admin.router)
    application.include_router(webhooks.router)
    application.include_router(order_help.router)
    application.include_router(cases.router)
    application.include_router(dev.router)
    application.include_router(console.router)
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
