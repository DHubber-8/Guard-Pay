"""Tests for idempotent deadline reminders."""

from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.models import AuditLog, Base, Case
from app.workers.deadlines import due_soon, run_once


@pytest.fixture
def db() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)


def add_case(db: Session, deadline: datetime, status: str = "open") -> Case:
    case = Case(
        mode="merchant",
        scenario="deadline-test",
        status=status,
        findings={},
        risk_level="low",
        evidence_status="complete",
        overall_assessment="test",
        response_deadline=deadline,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def test_thresholds_and_idempotency(db: Session) -> None:
    now = datetime.now(timezone.utc)
    case = add_case(db, now + timedelta(hours=12))

    assert case in due_soon(db)
    assert run_once(db) == 3
    assert {
        row.event for row in db.query(AuditLog).filter(AuditLog.case_id == case.id)
    } == {"deadline_7d", "deadline_3d", "deadline_1d"}
    assert run_once(db) == 0
    assert db.query(AuditLog).filter(AuditLog.case_id == case.id).count() == 3


def test_closed_cases_are_ignored(db: Session) -> None:
    now = datetime.now(timezone.utc)
    for status in ("resolved", "declined", "refund_sent", "closed"):
        add_case(db, now - timedelta(hours=1), status)

    assert run_once(db) == 0
    assert db.query(AuditLog).count() == 0


def test_overdue_case_is_flagged(db: Session) -> None:
    case = add_case(db, datetime.now(timezone.utc) - timedelta(hours=1))

    run_once(db)

    events = {
        row.event for row in db.query(AuditLog).filter(AuditLog.case_id == case.id)
    }
    assert "deadline_overdue" in events
