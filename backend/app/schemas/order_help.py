"""Schemas for buyer order-help requests."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from typing_extensions import Annotated


Email = Annotated[str, StringConstraints(min_length=3, max_length=320)]
OrderNumber = Annotated[str, StringConstraints(min_length=1, max_length=128)]


class OrderHelpLookupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_number: OrderNumber
    email: Email


class OrderHelpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order_number: OrderNumber
    email: Email
    reason: Literal["not_arrived", "damaged", "not_as_described", "cancel", "other"]
    not_arrived_reason: Literal[
        "delivered", "stuck", "customs", "late", "address", "notracking"
    ] | None = None
    note: str | None = None
    photos: list[str] = Field(default_factory=list)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("not_arrived_reason")
    @classmethod
    def validate_reason(cls, value: str | None, info):
        if info.data.get("reason") == "not_arrived" and value is None:
            raise ValueError("not_arrived_reason is required for not_arrived")
        if info.data.get("reason") != "not_arrived" and value is not None:
            raise ValueError("not_arrived_reason is only valid for not_arrived")
        return value


class BuyerMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: Annotated[str, StringConstraints(min_length=1)]


class TrackingStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    text: str


class OrderSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    order_number: str
    amount: str
    currency: str
    status: str
    tracking_number: str | None
    carrier: str | None


class OrderHelpLookupResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    order: OrderSummary
    tracking_steps: list[TrackingStep]


class OrderHelpAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["answer"]
    explanation: str
    tracking_steps: list[TrackingStep]


class OrderHelpSentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["sent_to_seller"]
    reply_due: str


class OrderHelpStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    status: Literal["waiting", "offer", "resolved"]
    offer: dict[str, object] | None
    seller_reply: dict[str, str] | None
