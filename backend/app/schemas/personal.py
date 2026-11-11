"""Schemas for personal Scam Check routes."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing_extensions import Annotated

from app.schemas.findings import PersonalFindings


class PersonalCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: Annotated[str, StringConstraints(min_length=1)]
    link_or_sender: str
    screenshots: list[str] = Field(default_factory=list)


class PersonalAnswersRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answers: list[str] = Field(min_length=1, max_length=10)


class PersonalDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["resolved", "monitor", "report"]


class PersonalCheckCreated(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    follow_up_questions: list[str]


class PersonalCheckHistoryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    title: str
    date: str
    risk: str
    decision: str | None


__all__ = [
    "PersonalAnswersRequest",
    "PersonalCheckCreated",
    "PersonalCheckHistoryItem",
    "PersonalCheckRequest",
    "PersonalDecisionRequest",
    "PersonalFindings",
]
