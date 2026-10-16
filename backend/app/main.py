"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import approvals, cases, order_help, personal, webhooks

app = FastAPI(title="dispute-helper API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks.router)
app.include_router(order_help.router)
app.include_router(cases.router)
app.include_router(approvals.router)
app.include_router(personal.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Return service health."""
    # TODO: Add dependency health checks.
    return {"status": "ok"}
