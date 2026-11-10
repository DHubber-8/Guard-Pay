"""Best-effort, redacted developer diagnostics."""

from __future__ import annotations

import json
import re
import sys
import threading
import time
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, func, select

from app.config import Settings, settings
from app.db.models import DevLog
from app.db.session import SessionLocal

_EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
_DIGITS = re.compile(r"\d{4,}")
_SECRET_VALUE = re.compile(
    r"(?i)\b(authorization|cookie|set-cookie|access[_-]?token|client[_-]?secret|password)\b(\s*[:=]\s*)[^\s,;]+"
)
_URL_QUERY = re.compile(r"(https?://[^\s?]+)\?[^\s]+", re.I)
_SENSITIVE = {
    "authorization", "cookie", "set-cookie", "set_cookie", "access_token", "client_secret",
    "password", "body", "request_body", "response_body", "payload",
}
_lock = threading.Lock()
_last_prune = 0.0
_session_factory = SessionLocal
_config = settings
request_id_var: ContextVar[str | None] = ContextVar("devlog_request_id", default=None)


def current_request_id() -> str | None:
    return request_id_var.get()


def configure(config: Settings) -> None:
    global _config
    _config = config


def _safe_message(value: Any) -> str:
    text = _SECRET_VALUE.sub(r"\1\2[redacted]", str(value or ""))
    text = _URL_QUERY.sub(r"\1", text)
    text = _EMAIL.sub("[email]", text)
    return _DIGITS.sub("[digits]", text)[:500]


def _safe_meta(value: Any) -> dict[str, Any]:
    def clean(item: Any, key: str = "") -> Any:
        if key.lower().replace("-", "_") in _SENSITIVE:
            return "[redacted]"
        if isinstance(item, dict):
            return {str(k): clean(v, str(k)) for k, v in item.items() if str(k).lower().replace("-", "_") not in _SENSITIVE}
        if isinstance(item, list):
            return [clean(v) for v in item]
        if isinstance(item, (str, int, float, bool)) or item is None:
            return _URL_QUERY.sub(r"\1", item) if isinstance(item, str) else item
        return str(item)

    cleaned = clean(value or {})
    if not isinstance(cleaned, dict):
        cleaned = {"value": cleaned}
    encoded = json.dumps(cleaned, ensure_ascii=True, default=str)
    if len(encoded) > 4096:
        encoded = encoded[:4093] + "..."
    try:
        result = json.loads(encoded)
    except json.JSONDecodeError:
        result = {"value": encoded}
    return result


def _prune(db: Any, now: datetime) -> None:
    global _last_prune
    current = time.monotonic()
    if current - _last_prune < 60:
        return
    _last_prune = current
    cutoff = now - timedelta(hours=max(1, _config.dev_logs_retention_hours))
    db.execute(delete(DevLog).where(DevLog.ts < cutoff))
    count = db.scalar(select(func.count()).select_from(DevLog)) or 0
    excess = count - max(1, _config.dev_logs_max_rows)
    if excess > 0:
        ids = db.scalars(select(DevLog.id).order_by(DevLog.id).limit(excess)).all()
        if ids:
            db.execute(delete(DevLog).where(DevLog.id.in_(ids)))


def record(kind: str, **fields: Any) -> None:
    """Persist a redacted diagnostic row, never affecting application flow."""
    if not _config.dev_logs_enabled:
        return
    try:
        allowed = fields.copy()
        message = _safe_message(allowed.pop("message", ""))
        paypal_meta: dict[str, Any] = {}
        if kind == "paypal_out":
            incoming_meta = allowed.pop("meta", {})
            if isinstance(incoming_meta, dict):
                paypal_meta.update(incoming_meta)
            paypal_meta.update(
                {
                    key: allowed[key]
                    for key in ("paypal_debug_id", "error_name", "error_message")
                    if key in allowed
                }
            )
            allowed = {
                key: allowed[key]
                for key in ("method", "path", "status", "duration_ms", "paypal_debug_id", "error_name", "error_message")
                if key in allowed
            }
        meta = _safe_meta(paypal_meta if kind == "paypal_out" else allowed.pop("meta", {}))
        now = datetime.now(timezone.utc)
        with _lock:
            db = _session_factory()
            try:
                db.add(
                    DevLog(
                        ts=now,
                        kind=kind,
                        request_id=fields.get("request_id"),
                        method=fields.get("method"),
                        path=str(fields.get("path", "")).split("?", 1)[0] or None,
                        status=fields.get("status"),
                        duration_ms=fields.get("duration_ms"),
                        level=str(fields.get("level", "INFO")),
                        message=message,
                        meta=meta,
                    )
                )
                _prune(db, now)
                db.commit()
            finally:
                db.close()
    except Exception as exc:
        print(f"developer log failure: {exc}", file=sys.stderr)


def query_logs(db: Any, *, kind: str | None, since_id: int | None, limit: int, q: str | None) -> list[DevLog]:
    stmt = select(DevLog).order_by(DevLog.id).limit(min(max(limit, 1), 200))
    if kind:
        stmt = stmt.where(DevLog.kind == kind)
    if since_id:
        stmt = stmt.where(DevLog.id > since_id)
    if q:
        stmt = stmt.where(DevLog.message.ilike(f"%{q}%"))
    return list(db.scalars(stmt))
