"""Clear and reseed the local synthetic database.

Owner: Digant
Status: in progress
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urlsplit

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings, settings
from app.db.models import Agreement, Approval, AuditLog, Base, Case, EvidenceItem, Offer, Order


def is_local_database_url(database_url: str) -> bool:
    """Allow SQLite and explicitly local development/Compose database hosts."""
    if not database_url or database_url.startswith("sqlite"):
        return True
    hostname = urlsplit(database_url).hostname
    return hostname in {"localhost", "127.0.0.1", "::1", "db"}


def validate_reset_target(config: Settings) -> None:
    """Refuse production or remote database targets before opening a session."""
    if config.env.lower() == "production":
        raise RuntimeError("Refusing demo reset when ENV is production.")
    if not is_local_database_url(config.database_url):
        raise RuntimeError("Refusing demo reset for a non-local DATABASE_URL host.")


def reset_demo(yes: bool, config: Settings = settings) -> int:
    """Delete local demo tables and reseed synthetic fixtures."""
    if not yes:
        raise ValueError("Reset requires the --yes flag.")
    validate_reset_target(config)

    from app.db.session import SessionLocal, engine
    from scripts.seed_demo import seed_demo

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for model in (EvidenceItem, Approval, AuditLog, Offer, Agreement, Case, Order):
            db.query(model).delete()
        db.commit()
        return seed_demo(db)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    print(f"Reset and seeded {reset_demo(args.yes)} synthetic demo cases.")
