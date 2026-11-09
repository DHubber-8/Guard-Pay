"""Password hashing, signed sessions, and authentication dependencies."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.models import User
from app.db.session import get_db

SESSION_COOKIE = "dispute_helper_session"
_SALT_BYTES = 16
_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1


def hash_password(password: str) -> str:
    """Hash a password with a random per-user salt."""
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P
    )
    return "$".join(
        [
            "scrypt",
            str(_SCRYPT_N),
            str(_SCRYPT_R),
            str(_SCRYPT_P),
            base64.urlsafe_b64encode(salt).decode(),
            base64.urlsafe_b64encode(digest).decode(),
        ]
    )


def verify_password(password: str, encoded: str) -> bool:
    """Constant-time compare a password against a stored hash."""
    try:
        algorithm, n, r, p, salt_text, digest_text = encoded.split("$")
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode())
        expected = base64.urlsafe_b64decode(digest_text.encode())
        actual = hashlib.scrypt(
            password.encode(), salt=salt, n=int(n), r=int(r), p=int(p)
        )
    except (ValueError, TypeError, OverflowError):
        return False
    return hmac.compare_digest(actual, expected)


def _signature(payload: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_session_token(user_id: int, config: Settings = settings) -> str:
    expires_at = int(time.time()) + config.session_ttl_seconds
    payload = f"{user_id}.{expires_at}"
    return f"{payload}.{_signature(payload, config.session_secret)}"


def get_session_user_id(token: str | None, config: Settings = settings) -> int | None:
    if not token or not config.session_secret:
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    user_id_text, expires_text, signature = parts
    payload = f"{user_id_text}.{expires_text}"
    if not hmac.compare_digest(signature, _signature(payload, config.session_secret)):
        return None
    try:
        user_id = int(user_id_text)
        expires_at = int(expires_text)
    except ValueError:
        return None
    if expires_at <= int(time.time()):
        return None
    return user_id


def require_user(role: str | None = None) -> Callable:
    """Build a dependency requiring a valid session and optionally a role."""

    def dependency(
        request: Request, db: Session = Depends(get_db)
    ) -> User:
        config = getattr(request.app.state, "settings", settings)
        user_id = get_session_user_id(request.cookies.get(SESSION_COOKIE), config)
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )
        if role is not None and user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user

    return dependency
