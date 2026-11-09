"""Authentication routes."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    SESSION_COOKIE,
    create_session_token,
    hash_password,
    require_user,
    verify_password,
)
from app.config import Settings, settings
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
_attempts: defaultdict[str, deque[float]] = defaultdict(deque)
_attempts_lock = Lock()
_MAX_LOGIN_ATTEMPTS = 10
_WINDOW_SECONDS = 60


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: Annotated[str, StringConstraints(min_length=3, max_length=320)]
    name: Annotated[str, StringConstraints(min_length=1, max_length=255)]
    role: Literal["merchant", "individual"]
    password: Annotated[str, StringConstraints(min_length=8)]

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("email must be valid")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: Annotated[str, StringConstraints(min_length=3, max_length=320)]
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("email must be valid")
        return value


def _cookie_options(config: Settings) -> dict[str, object]:
    production = config.env.lower() == "production"
    return {
        "httponly": True,
        "secure": production,
        "samesite": "none" if production else "lax",
        "max_age": config.session_ttl_seconds,
    }


def _set_session(response: Response, user: User, config: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        create_session_token(user.id, config),
        **_cookie_options(config),
    )


def _check_login_rate_limit(ip: str) -> None:
    now = time.monotonic()
    with _attempts_lock:
        attempts = _attempts[ip]
        while attempts and now - attempts[0] >= _WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= _MAX_LOGIN_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Too many login attempts")
        attempts.append(now)


def _invalid_login() -> HTTPException:
    return HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/signup")
def signup(
    payload: SignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Email is already registered"
        ) from None
    _set_session(response, user, getattr(request.app.state, "settings", settings))
    return {"role": user.role, "name": user.name}


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _check_login_rate_limit(request.client.host if request.client else "unknown")
    user = db.query(User).filter(User.email == payload.email).one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise _invalid_login()
    _set_session(response, user, getattr(request.app.state, "settings", settings))
    return {"role": user.role, "name": user.name}


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "logged_out"}


@router.get("/me")
def me(user: User = Depends(require_user())) -> dict[str, str]:
    return {"role": user.role, "name": user.name}
