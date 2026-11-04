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
Stored in `Case.findings`. The case screen reads (see `toCaseDetail` in the API file):
```json
{
  "case_summary": "Buyer says the parcel never arrived. Carrier data shows ...",
  "risk_reasons": ["5 item-not-received claims in 90 days"],
  "evidence_supporting": [{ "description": "Tracking shows delivered 14 Oct", "source": "paypal", "verified": true }],
  "evidence_contradicting": [{ "description": "Buyer says nobody was home", "source": "buyer", "verified": false }],
  "missing_information": ["Police report"],
  "recommended_actions": ["Rule in favour of the seller", "Ask the buyer for more information"],
  "overall_assessment": "high_suspicion | medium_suspicion | low_suspicion | inconclusive",
  "requires_human_decision": true,
  "stage": "Inquiry | Claim",
  "buyer_name": "Jordan Claims", "merchant_name": "Daniel Tradeworks", "amount": "186.00", "assignee": "staff-diana",
  "buyer": { "name": "...", "email": "...", "since": "Feb 2025", "disputes90d": 5, "country": "US" },
  "merchant": { "name": "...", "email": "...", "since": "Aug 2019", "disputeRate": "0.9%", "sellerProtection": "Eligible" },
  "transaction": { "id": "9KX20417LM553201A", "date": "8 Oct 2026", "items": "1 × Wireless speaker", "shipTo": "...", "tracking": "UPS ..." }
}
```
`source` is one of `paypal | buyer | merchant`. No confidence percentages (RULES.md).

### 2. Case routes (A6, `routes/cases.py`)
- `GET /cases` → list of `Case` rows with `findings` filled (the queue reads `paypal_dispute_id`, `scenario`, `status`, `risk_level`, `evidence_status`, `response_deadline`).
- `GET /cases/{id}` (accepts the PayPal dispute id) → the case plus `timeline: [{ "date", "text", "alert" }]` built from the dispute history.
- `scenario` values: `item_not_received | not_as_described | unauthorized | unrecognized_charge | scam_report`.

### 3. Decisions (A6 + B6, `routes/approvals.py`)
`POST /cases/{id}/approve` body:
```json
{ "action_type": "Rule in favour of the seller", "approver_id": "staff-diana",
  "decision": "Approved AI suggestion | Chose a different action", "ai_recommendation": "Rule in favour of the seller", "notes": "..." }
```
Must write an `Approval` and an `AuditLog` row, reject an empty `approver_id`, and only then call PayPal: `accept_claim` / `provide_evidence` (A3) for a ruling, `refund_capture` (A4) for a refund. `notes` is required when the decision differs from the AI. Respond `{ "status": "recorded" }` only once the rows are saved; the console treats any other response as a failure.

### 4. Request information through PayPal (A3)
`POST /cases/{id}/request-info` body `{ "party": "buyer | merchant", "message": "...", "approver_id": "staff-..." }` → sends a message through the PayPal Disputes API (`send_message` in `paypal/disputes.py`, which requires `approver_id` and `case_id`), sets the case to `Waiting for buyer | Waiting for merchant`, writes an `AuditLog` row. Response `{ "status": "sent", "via": "paypal" }`.

### 5. Fixtures (A8, `data/fixtures/*.json`)
`scripts/seed_demo.py` (A8) seeds the damaged hand cream fixtures from the merchant plan. For the console demo, also seed staff cases like the ones in `frontend/src/mock/console.js` (item not received, unauthorized, not as described, unrecognized charge, scam report), using the team's sandbox accounts (names and emails only; passwords stay in `.env`).

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

### 9. Audit log
`GET /audit-log` → `[{ "at", "case", "action", "ai", "decision", "by", "notes" }]`, newest first. Rows from the A7 workers use `by: "deadline-watch"` or `"delivery-watch"` and `decision: "Reminder sent"` or `"Flag raised"`.

### 10. Automatic checks (A7, `workers/`)
Both workers only read data, then write flags, reminders and audit rows. They never decide a case or move money (`docs/RULES.md`).
- **Deadline watch** (`workers/deadlines.py`, about every 15 min): read `response_due_date` from PayPal (`get_dispute` in A3), keep `Case.response_deadline` up to date, and for cases due in under 24 h write an `AuditLog` row (`by: "deadline-watch"`, `action: "Deadline reminder: PayPal response due in N h"`, `notes: "Sent to <staff>"`). The queue's "Due in 24 h" view and the red deadlines come from `response_deadline`.
- **Delivery watch** (`workers/delivery_watch.py`, about every 30 min): for open cases with tracking, read the carrier status (`get_tracking` in A4, mock carrier in A8) and save it on the case as `findings.delivery_watch`:
  `{ "carrier": "UPS", "tracking_number": "1Z…", "status": "delivered | in_transit | stuck | lost | not_shipped", "latest_event": "14 Oct 10:42 · Delivered, signed", "last_checked": "<ISO time>", "mismatch": "Carrier says delivered; buyer says not received" | null }`.
  The first four statuses come straight from the carrier (or the A8 mock carrier); use `not_shipped` when the order has no tracking. When `mismatch` is set or the parcel is `stuck` or `lost`, also add a Delivery flag (§7) and an `AuditLog` row (`by: "delivery-watch"`, `decision: "Flag raised"`).
- `GET /workers/status` → `{ "delivery": { "lastRun", "every" }, "deadline": { "lastRun", "every" } }` for the Overview card.

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
