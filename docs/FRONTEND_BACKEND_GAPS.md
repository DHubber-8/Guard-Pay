<!-- Owner: Diana; Status: in review -->
# Frontend ↔ backend gaps (staff console)

The frontend is now a console for **PayPal staff**. Every screen works on demo data.
This file lists what the backend needs so the screens can run on real data. The
frontend calls everything through `frontend/src/api/index.js`; set
`VITE_USE_MOCK=false` in `frontend/.env` to switch to the backend.

All data comes from PayPal (webhooks, Disputes API, Orders, tracking, account and
security history). The console never contacts buyers or merchants directly:
requests for information go out through PayPal's Resolution Center.

Checked against `main` at `9b3dcf6` (after A3, A4 and A8 were merged).

**Backend status note (2026-11-10):** The current backend also includes the
shared findings contract, authentication, case/order-help/personal/approval
routes, delivery/deadline workers, resettable demo fixtures, readiness checks,
and Postman collections. The item notes below retain the frontend-facing
requirements and are updated only where the backend implementation now exists.

## What already lines up
- `POST /webhooks/paypal` turns `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED` into `Case` rows. That is exactly how disputes reach the queue.
- `paypal/client.py` (OAuth) and `paypal/orders.py` (order lookup) give the transaction details.
- Dispute wrappers (A3, `paypal/disputes.py`): `list_disputes`, `get_dispute`, `send_message`, `accept_claim` and `provide_evidence`, each checking approval and `allowed_response_options`. The A6 routes can call these directly.
- Refund and tracking wrappers (A4, `paypal/refunds.py`, `paypal/tracking.py`): `get_capture`, `refund_capture`, `add_tracking` and `get_tracking`. Decisions use the refund wrapper; the delivery watch (§10) uses `get_tracking`.
- Mock carrier (A8, `mocks/carrier.py`, `GET /mock-carrier/tracking/{number}`): returns `delivered`, `in_transit`, `stuck` or `lost` from the tracking number, which is what the delivery watch needs for the demo.
- `Approval` (`approver_id`, `action_type`, `ai_recommendation`, decision, notes) and `AuditLog` match the decision and audit screens.
- CORS: `FRONTEND_ORIGIN` defaults to `http://localhost:5173`, the Vite port.

## Must have (blocks the demo)

### 1. Findings contract (S1, `schemas/findings.py`)
The backend contract is implemented with strict Pydantic models and separate
`risk` and `evidence_status` fields; stored payloads are validated without
inventing confidence or probability fields. The older case-detail shape below
is retained as a frontend compatibility note and is not the backend S1 schema.
```json
{
  "case_summary": "Buyer says the parcel never arrived. Carrier data shows ...",
  "risk_reasons": ["5 item-not-received claims in 90 days"],
  "evidence_supporting": [{ "description": "Tracking shows delivered 14 Oct", "source": "paypal", "verified": true }],
  "evidence_contradicting": [{ "description": "Buyer says nobody was home", "source": "buyer", "verified": false }],
  "missing_information": ["Police report"],
  "recommended_actions": [
    { "id": "seller", "title": "Rule in favour of the seller", "sub": "Delivery and signature are verified" },
    { "id": "info_buyer", "title": "Ask the buyer for more information" },
    { "id": "buyer_full", "title": "Rule in favour of the buyer · refund $186.00", "moves_money": true }
  ],
  "recommendation": "Recommend ruling for the seller and sending the claim history to the risk team.",
  "overall_assessment": "high_suspicion | medium_suspicion | low_suspicion | inconclusive",
  "requires_human_decision": true,
  "stage": "Inquiry | Claim",
  "buyer_name": "Jordan Claims", "merchant_name": "Daniel Tradeworks", "amount": "186.00", "assignee": "staff-diana",
  "buyer": { "name": "...", "email": "...", "since": "Feb 2025", "disputes90d": 5, "country": "US" },
  "merchant": { "name": "...", "email": "...", "since": "Aug 2019", "disputeRate": "0.9%", "sellerProtection": "Eligible" },
  "transaction": { "id": "9KX20417LM553201A", "date": "8 Oct 2026", "items": "1 × Wireless speaker", "shipTo": "...", "tracking": "UPS ..." }
}
```
`source` is one of `paypal | buyer | merchant`. The first action is the AI's pick. Action ids starting with `info_` (`info_buyer`, `info_merchant`) open the request-info flow instead of a decision; `moves_money: true` shows a warning before confirming. Plain strings still work, but their ids are guessed from the wording. No confidence percentages (RULES.md).

### 2. Case routes (A6, `routes/cases.py`) — implemented
- `GET /cases` → authenticated merchant list with pagination, type filtering, and parsed-or-preserved `findings`.
- `GET /cases/{id}` → authenticated merchant detail with order, evidence, offers, and an oldest-first timeline.
- Case detail currently accepts the numeric database id. Type derivation is `dispute`, `orderhelp`, `risk`, or `delivery` from the PayPal/scenario markers.

### 3. Decisions (A6 + B6, `routes/approvals.py`) — backend approval flow implemented
The implemented merchant endpoints use:
```json
{ "offer": "partial | full | replace", "amount": "15.00", "message": "..." }
```
- `POST /cases/{id}/approve` records the approval, offer, and audit row before
  attempting a refund. `replace` moves no money; `partial` and `full` use the
  capture refund wrapper after the transaction commits.
- `POST /cases/{id}/decline` records a decline and never calls PayPal.
- The backend uses the signed-in merchant session as `approver_id`; it does not
  accept a caller-provided approver identity.

### 4. Request information through PayPal (A3)
`POST /cases/{id}/request-info` body `{ "party": "buyer | merchant", "message": "...", "approver_id": "staff-..." }` → sends a message through the PayPal Disputes API (`send_message` in `paypal/disputes.py`, which requires `approver_id` and `case_id`), sets the case to `Waiting for buyer | Waiting for merchant`, writes an `AuditLog` row. Response `{ "status": "sent", "via": "paypal" }`. PayPal only allows `send_message` in some dispute states (check `allowed_response_options`). When it isn't allowed, respond `409` with a short `detail`; the console then shows that the request wasn't sent and changes nothing.

### 5. Fixtures (A8, `backend/app/fixtures/`)
`backend/scripts/seed_demo.py` seeds the damaged hand cream fixtures from the
merchant plan, marks seeded rows, and creates synthetic shipment examples.
`backend/app/fixtures/` is packaged into Docker; the obsolete root fixture
stubs are removed. Frontend-only staff samples remain in
`frontend/src/mock/console.js` until the live console integration is completed.

## Should have

### 6. Account and transaction check
`GET /checks?q=<email or transaction id>` → 404 when nothing is found, otherwise:
```json
{ "kind": "Account | Transaction", "title": "...", "sub": "...", "risk": "high", "evidenceStatus": "complete",
  "facts": [["Disputes (90 days)", "5"]], "rows": [{ "kind": "verified", "text": "...", "detail": "..." }],
  "action": "Consider sending the account to the risk team ...", "cases": ["PP-D-41027"] }
```

### 7. Flags
`GET /flags` → `[{ "id", "level": "high | medium", "kind": "Account | Transaction | Delivery", "subject", "text", "when", "query", "case" }]`. `query` is what the frontend passes to `/checks`. Delivery flags (from the A7 delivery watch) send `case` instead, and open that case.

### 8. Assignment and staff
- `POST /cases/{id}/assign` body `{ "staff_id" }`.
- Staff sign-in: the frontend doesn't call the backend for this yet. "Continue with PayPal" signs in a demo staff member in the browser. In production this would be PayPal's staff single sign-on.
- Until then `approver_id` comes from the browser, so it is only trustworthy for the demo. Once there is a real session, the backend should take the approver from the session and ignore the `approver_id` in the request body.

### 9. Audit log
`GET /audit-log` → `[{ "at", "case", "action", "ai", "decision", "by", "notes" }]`, newest first. Rows from the A7 workers use `by: "deadline-watch"` or `"delivery-watch"` and `decision: "Reminder sent"` or `"Flag raised"`.

### 10. Automatic checks (A7, `workers/`) — implemented with a narrower current contract
Both workers only read data, then write flags, reminders and audit rows. They never decide a case or move money (`docs/RULES.md`).
- **Deadline watch** (`workers/deadlines.py`): `due_soon(db, days=3)` finds open cases due within three days or overdue. The `--once` worker writes idempotent `deadline_7d`, `deadline_3d`, `deadline_1d`, and `deadline_overdue` audit rows without changing case status.
- **Delivery watch** (`workers/delivery_watch.py`): polls open `Shipment` rows, maps mock/carrier statuses to `on_time`, `delayed`, `customs`, `failed`, or `delivered`, records drafted messages for delayed/failed shipments, and writes one audit row per status change.
- `POST /admin/run-workers` runs both workers with the configured admin token. `WORKERS_ENABLED` enables the background delivery loop; a separate status endpoint is not currently implemented.

## Nice to have
- `GET /auth/me` → `{ "id", "name", "initials", "role" }` with an httpOnly cookie, so the signed-in staff member comes from the backend (the frontend already sends `credentials: "include"`).
- `GET /insights` → `{ weeks, opened, closed, reasons: [[label, percent]], stats: { avgHoursToDecision, misunderstandings, aiAgreed, flagsThisWeek }, patterns: [[name, trend, detail]] }`.

## No longer needed
The frontend no longer serves merchants or buyers, so it doesn't call these. They can be removed or left as stubs:
- `POST /order-help`, `GET /order-help/{order_id}` (`routes/order_help.py`) and the Order Help lookup / accept endpoints from the earlier plan.
- The `/personal` router (`routes/personal.py`) and personal Scam Check.
- `POST /cases/{id}/decline`: staff decisions all go through `/approve` with a `decision` field.
- Merchant settings, merchant stats and the merchant shipments page.

Tracking data is still needed, but only for the delivery watch (§10), not as a separate page.
