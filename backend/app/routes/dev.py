"""Protected developer log inspection page and APIs."""

from __future__ import annotations

import hmac
import statistics
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.db.models import DevLog
from app.db.session import get_db
from app.devlogs import query_logs

router = APIRouter(tags=["developer"])


def _config(request: Request) -> Settings:
    return getattr(request.app.state, "settings", settings)


def _guard(request: Request, token: str | None) -> Settings:
    config = _config(request)
    if not config.dev_logs_enabled:
        raise HTTPException(status_code=404, detail="Not found")
    if not config.admin_token:
        raise HTTPException(status_code=404, detail="Not found")
    if not token or not hmac.compare_digest(token, config.admin_token):
        raise HTTPException(status_code=403, detail="Invalid admin token")
    return config


def _row(row: DevLog) -> dict[str, Any]:
    return {
        "id": row.id,
        "ts": row.ts.isoformat(),
        "kind": row.kind,
        "request_id": row.request_id,
        "method": row.method,
        "path": row.path,
        "status": row.status,
        "duration_ms": float(row.duration_ms) if row.duration_ms is not None else None,
        "level": row.level,
        "message": row.message,
        "meta": row.meta or {},
    }


@router.get("/dev/logs")
def logs(
    request: Request,
    x_admin_token: str | None = Header(default=None),
    kind: str | None = None,
    since_id: int | None = None,
    limit: int = Query(default=200, ge=1, le=200),
    q: str | None = None,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _guard(request, x_admin_token)
    rows = query_logs(db, kind=kind, since_id=since_id, limit=limit, q=q)
    latest = db.scalar(select(DevLog.id).order_by(DevLog.id.desc()).limit(1))
    return {"rows": [_row(row) for row in rows], "latest_id": latest}


@router.get("/dev/logs/stats")
def stats(
    request: Request,
    x_admin_token: str | None = Header(default=None),
    minutes: int = Query(default=60, ge=1, le=1440),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _guard(request, x_admin_token)
    cutoff = datetime.now(timezone.utc).timestamp() - minutes * 60
    rows = list(
        db.scalars(
            select(DevLog)
            .where(DevLog.ts >= datetime.fromtimestamp(cutoff, timezone.utc))
            .order_by(DevLog.id)
        )
    )
    counts: dict[str, int] = {}
    classes: dict[str, int] = {}
    requests: list[float] = []
    paths: dict[str, list[float]] = {}
    for row in rows:
        counts[row.kind] = counts.get(row.kind, 0) + 1
        if row.status is not None:
            status_class = f"{row.status // 100}xx"
            classes[status_class] = classes.get(status_class, 0) + 1
        if row.kind == "request" and row.duration_ms is not None:
            duration = float(row.duration_ms)
            requests.append(duration)
            paths.setdefault(row.path or "", []).append(duration)
    slowest = sorted(
        ({"path": path, "duration_ms": max(values)} for path, values in paths.items()),
        key=lambda item: item["duration_ms"],
        reverse=True,
    )[:5]
    def percentile(values: list[float], percentile_value: float) -> float | None:
        if not values:
            return None
        if len(values) == 1:
            return values[0]
        return statistics.quantiles(values, n=100, method="inclusive")[round(percentile_value) - 1]

    return {
        "counts": counts,
        "status_classes": classes,
        "request_duration_ms": {
            "p50": percentile(requests, 50),
            "p95": percentile(requests, 95),
        },
        "slowest_paths": slowest,
    }


@router.get("/dev", response_class=HTMLResponse)
def page(request: Request, x_admin_token: str | None = Header(default=None)) -> HTMLResponse:
    _guard(request, x_admin_token)
    html = """<!doctype html><meta charset="utf-8"><title>Developer logs</title>
<style>
body{font:14px system-ui;margin:20px;background:#111827;color:#e5e7eb}input,button{padding:8px;margin:3px;background:#1f2937;color:inherit;border:1px solid #4b5563;border-radius:4px}button{cursor:pointer}.tabs button.active{background:#2563eb}.row{padding:8px;border-bottom:1px solid #374151;cursor:pointer}.meta{display:none;white-space:pre-wrap;background:#0b1220;padding:8px}.open .meta{display:block}.s2{color:#86efac}.s4{color:#fbbf24}.s5{color:#fca5a5}a{color:#93c5fd}
</style><h1>Developer logs</h1><p>Token stays in memory only. <a href="https://dashboard.render.com/">Render dashboard</a> · <a href="https://developer.paypal.com/dashboard/">PayPal developer dashboard</a></p>
<input id="token" type="password" placeholder="X-Admin-Token"><input id="filter" placeholder="Text filter"><button id="pause">Pause</button>
<div class="tabs"><button data-kind="request" class="active">Requests</button><button data-kind="paypal_out">PayPal</button><button data-kind="paypal_webhook">Webhooks</button><button data-kind="app">App</button></div><div id="rows"></div>
<script>
let token='',since=0,paused=false,kind='request';const rows=document.getElementById('rows');
document.getElementById('token').oninput=e=>token=e.target.value;
document.getElementById('filter').oninput=render;
document.getElementById('pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Resume':'Pause'};
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;since=0;rows.innerHTML='';document.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('active',x===b));poll()});
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(){const q=document.getElementById('filter').value.toLowerCase();document.querySelectorAll('.row').forEach(x=>x.style.display=x.dataset.text.includes(q)?'block':'none')}
function add(r){const cls=r.status>=500?'s5':r.status>=400?'s4':r.status>=200?'s2':'';const d=document.createElement('div');d.className='row';d.dataset.text=(r.message+' '+(r.path||'')).toLowerCase();d.innerHTML='<b class="'+cls+'">'+esc(r.status||'')+' '+esc(r.kind)+'</b> '+esc(r.ts)+' '+esc(r.method||'')+' '+esc(r.path||'')+' '+esc(r.duration_ms||'')+'ms<br>'+esc(r.message)+'<div class="meta">'+esc(JSON.stringify(r.meta,null,2))+'</div>';d.onclick=()=>d.classList.toggle('open');rows.appendChild(d)}
async function poll(){if(paused||!token)return;const p=new URLSearchParams({limit:'200'});if(kind)p.set('kind',kind);if(since)p.set('since_id',since);const r=await fetch('/dev/logs?'+p,{headers:{'X-Admin-Token':token}});if(r.ok){const j=await r.json();j.rows.forEach(add);if(j.latest_id)since=j.latest_id;render()}}
setInterval(poll,3000);poll();
</script>"""
    return HTMLResponse(
        html,
        headers={"Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self';", "Cache-Control": "no-store"},
    )
