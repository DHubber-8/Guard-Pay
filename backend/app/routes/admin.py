"""Administrative demo-data routes."""

from __future__ import annotations

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.session import get_db
from scripts.seed_demo import clear_seeded_demo, seed_demo

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reseed-demo")
def reseed_demo(
    request: Request,
    x_admin_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict[str, int | str]:
    config: Settings = getattr(request.app.state, "settings", settings)
    if not config.admin_token:
        raise HTTPException(status_code=404, detail="Not found")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, config.admin_token):
        raise HTTPException(status_code=403, detail="Invalid admin token")
    clear_seeded_demo(db)
    count = seed_demo(db, config=config)
    return {"status": "reseeded", "cases": count}
