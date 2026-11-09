"""Personal suspicious-payment routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db.models import AuditLog, Case, EvidenceItem, User
from app.db.session import get_db
from app.personal_stub import analyze_personal_check
from app.schemas.findings import PersonalFindings, case_columns
from app.schemas.personal import (
    PersonalAnswersRequest,
    PersonalCheckCreated,
    PersonalCheckHistoryItem,
    PersonalCheckRequest,
    PersonalDecisionRequest,
)

router = APIRouter(
    prefix="/personal",
    tags=["personal"],
    dependencies=[Depends(require_user())],
)

_FOLLOW_UP_QUESTIONS = [
    "What did the sender ask you to do?",
    "Did you already click a link, share information, or send money?",
]


def _owned_case(db: Session, case_id: int, user: User) -> Case:
    case = (
        db.query(Case)
        .join(AuditLog, AuditLog.case_id == Case.id)
        .filter(
            Case.id == case_id,
            Case.mode == "personal",
            AuditLog.event == "personal_check_created",
            AuditLog.details["user_id"].as_integer() == user.id,
        )
        .one_or_none()
    )
    if case is None:
        raise HTTPException(status_code=404, detail="Personal check not found")
    return case


def _answer_rounds(db: Session, case_id: int) -> int:
    return (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id, AuditLog.event == "personal_answers")
        .count()
    )


def _created_check(db: Session, case_id: int) -> AuditLog:
    created = (
        db.query(AuditLog)
        .filter(AuditLog.case_id == case_id, AuditLog.event == "personal_check_created")
        .order_by(AuditLog.id.asc())
        .first()
    )
    if created is None:
        raise HTTPException(status_code=404, detail="Personal check not found")
    return created


@router.post("/checks", response_model=PersonalCheckCreated)
def create_check(
    payload: PersonalCheckRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user()),
) -> PersonalCheckCreated:
    now = datetime.now(timezone.utc)
    case = Case(
        mode="personal",
        scenario="personal_check",
        status="awaiting_answers",
        findings={
            "description": payload.description,
            "link_or_sender": payload.link_or_sender,
        },
        risk_level="inconclusive",
        evidence_status="missing",
        overall_assessment="Personal decision support pending answers",
        created_at=now,
        updated_at=now,
    )
    db.add(case)
    db.flush()
    for screenshot in payload.screenshots:
        db.add(
            EvidenceItem(
                case=case,
                description=screenshot,
                source="personal_screenshot",
                verified=False,
                created_at=now,
            )
        )
    db.add(
        AuditLog(
            case=case,
            actor=str(user.id),
            event="personal_check_created",
            details={
                "user_id": user.id,
                "description": payload.description,
                "link_or_sender": payload.link_or_sender,
            },
            created_at=now,
        )
    )
    db.commit()
    return PersonalCheckCreated(id=case.id, follow_up_questions=_FOLLOW_UP_QUESTIONS[:2])


@router.post("/checks/{case_id}/answers", response_model=PersonalFindings)
def answer_check(
    case_id: int,
    payload: PersonalAnswersRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user()),
) -> PersonalFindings:
    case = _owned_case(db, case_id, user)
    if _answer_rounds(db, case.id) >= 2:
        raise HTTPException(status_code=409, detail="This personal check has reached its answer limit")
    details = _created_check(db, case.id).details
    findings = analyze_personal_check(
        str(details.get("description", "")),
        str(details.get("link_or_sender", "")),
        payload.answers,
    )
    case.findings = findings.model_dump()
    case.risk_level, case.evidence_status = (
        case_columns(findings)["risk_level"],
        case_columns(findings)["evidence_status"],
    )
    case.status = "analyzed"
    db.add(
        AuditLog(
            case=case,
            actor=str(user.id),
            event="personal_answers",
            details={"answers": payload.answers, "round": _answer_rounds(db, case.id) + 1},
        )
    )
    db.commit()
    return findings


@router.post("/checks/{case_id}/decision")
def decide_check(
    case_id: int,
    payload: PersonalDecisionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user()),
) -> dict[str, str]:
    case = _owned_case(db, case_id, user)
    case.status = payload.decision
    db.add(
        AuditLog(
            case=case,
            actor=str(user.id),
            event="personal_decision",
            details={"decision": payload.decision},
        )
    )
    db.commit()
    return {"id": str(case.id), "decision": payload.decision, "status": case.status}


@router.get("/checks", response_model=list[PersonalCheckHistoryItem])
def list_checks(
    db: Session = Depends(get_db),
    user: User = Depends(require_user()),
) -> list[PersonalCheckHistoryItem]:
    cases = (
        db.query(Case)
        .join(AuditLog, AuditLog.case_id == Case.id)
        .filter(
            Case.mode == "personal",
            AuditLog.event == "personal_check_created",
            AuditLog.details["user_id"].as_integer() == user.id,
        )
        .order_by(Case.created_at.desc())
        .all()
    )
    history: list[PersonalCheckHistoryItem] = []
    for case in cases:
        created = (
            db.query(AuditLog)
            .filter(AuditLog.case_id == case.id, AuditLog.event == "personal_check_created")
            .order_by(AuditLog.id.asc())
            .first()
        )
        decision = (
            db.query(AuditLog)
            .filter(AuditLog.case_id == case.id, AuditLog.event == "personal_decision")
            .order_by(AuditLog.id.desc())
            .first()
        )
        description = str((created.details if created else {}).get("description", "Personal check"))
        history.append(
            PersonalCheckHistoryItem(
                id=case.id,
                title=description[:80],
                date=(case.created_at or datetime.now(timezone.utc)).date().isoformat(),
                risk=case.risk_level,
                decision=(decision.details if decision else {}).get("decision"),
            )
        )
    return history
