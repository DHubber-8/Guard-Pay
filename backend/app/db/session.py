"""SQLAlchemy engine and FastAPI session dependency.

Owner: Digant
Status: in progress
"""

from collections.abc import Generator
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings, settings


logger = logging.getLogger(__name__)
LOCAL_SQLITE_FILE = "dispute_helper.db"


def normalize_database_url(database_url: str) -> str:
    """Normalize legacy PostgreSQL URL schemes for psycopg."""
    if database_url.startswith("postgres://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgres://")
    if database_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgresql://")
    return database_url


def resolve_database_url(config: Settings) -> str:
    """Return the configured database URL or the safe local-development fallback."""
    if config.database_url:
        return normalize_database_url(config.database_url)
    if config.env.lower() == "production":
        raise RuntimeError("DATABASE_URL must be set when ENV=production")

    fallback_url = f"sqlite:///./{LOCAL_SQLITE_FILE}"
    logger.warning(
        "DATABASE_URL is empty; using local SQLite database file %s",
        LOCAL_SQLITE_FILE,
    )
    return fallback_url


database_url = resolve_database_url(settings)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and close it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
