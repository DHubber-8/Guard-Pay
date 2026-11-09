"""Record idempotent audit reminders for approaching case deadlines."""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.models import AuditLog, Case
from app.db.session import SessionLocal

_CLOSED_STATUSES = {
    "closed",
    "declined",
    "refund_failed",
    "refund_sent",
    "replacement_offered",
    "resolved",
}
_THRESHOLDS: tuple[tuple[str, int | None], ...] = (
    ("7d", 7),
    ("3d", 3),
    ("1d", 1),
    ("overdue", None),
)


def _as_utc(value: datetime) -> datetime:
    """Normalize database datetimes for comparison across SQLite and PostgreSQL."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def due_soon(db: Session, days: int = 3) -> list[Case]:
    """Return open cases due within ``days`` days, including overdue cases."""
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    return [
        case
        for case in db.query(Case).filter(Case.response_deadline.is_not(None)).all()
        if case.status not in _CLOSED_STATUSES
        and _as_utc(case.response_deadline) <= cutoff
    ]


def _threshold_for(deadline: datetime, now: datetime) -> str | None:
    remaining = _as_utc(deadline) - now
    if remaining.total_seconds() <= 0:
        return "overdue"
    if remaining <= timedelta(days=1):
        return "1d"
    if remaining <= timedelta(days=3):
        return "3d"
    if remaining <= timedelta(days=7):
        return "7d"
    return None


def run_once(db: Session) -> int:
    """Write each crossed deadline threshold at most once per case."""
    now = datetime.now(timezone.utc)
    created = 0
    for case in due_soon(db, days=3):
        threshold = _threshold_for(case.response_deadline, now)
        if threshold is None:
            continue
        threshold_days = {"7d": 7, "3d": 3, "1d": 1}
        if threshold == "overdue":
            crossed = [name for name, _ in _THRESHOLDS]
        else:
            crossed = [
                name
                for name, days in _THRESHOLDS
                if days is not None and days >= threshold_days[threshold]
            ]
        existing_events = {
            audit.event
            for audit in db.query(AuditLog)
            .filter(AuditLog.case_id == case.id)
            .all()
        }
        for name in crossed:
            event = f"deadline_{name}"
            if event in existing_events:
                continue
            db.add(
                AuditLog(
                    case_id=case.id,
                    actor="deadlines",
                    event=event,
                    details={
                        "case_id": case.id,
                        "threshold": name,
                        "response_deadline": _as_utc(case.response_deadline).isoformat(),
                    },
                )
            )
            created += 1
    db.commit()
    return created


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if not args.once:
        parser.error("only --once is supported")
    with SessionLocal() as db:
        run_once(db)


if __name__ == "__main__":
    main()
