<!-- Owner: Diana; Status: in review -->
# Frontend ↔ backend gaps (staff console)

The frontend is now a console for **PayPal staff**. Every screen works on demo data.
This file lists what the backend needs so the screens can run on real data. The
frontend calls everything through `frontend/src/api/index.js`; set
`VITE_USE_MOCK=false` in `frontend/.env` to switch to the backend.

All data comes from PayPal (webhooks, Disputes API, Orders, tracking, account and
security history). The console never contacts buyers or merchants directly:
requests for information go out through PayPal's Resolution Center.

Checked against `main` at `2a4389b`.

## What already lines up
- `POST /webhooks/paypal` turns `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED` into `Case` rows. That is exactly how disputes reach the queue.
- `paypal/client.py` (OAuth) and `paypal/orders.py` (order lookup) give the transaction details.
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
Must write an `Approval` and an `AuditLog` row, reject an empty `approver_id`, and only then call PayPal (refund or dispute outcome). `notes` is required when the decision differs from the AI.

### 4. Request information through PayPal (A3)
`POST /cases/{id}/request-info` body `{ "party": "buyer | merchant", "message": "...", "approver_id": "staff-..." }` → sends a message through the PayPal Disputes API (`send_message` in `paypal/disputes.py`, which requires `approver_id` and `case_id`), sets the case to `Waiting for buyer | Waiting for merchant`, writes an `AuditLog` row. Response `{ "status": "sent", "via": "paypal" }`.

### 5. Dispute wrappers (A3, `paypal/disputes.py`)
On the `feat/a3-disputes-wrapper` branch: `list_disputes`, `get_dispute`, `send_message`, `accept_claim` and `provide_evidence`, each checking approval and `allowed_response_options`. The routes in A6 can call these directly.

### 6. Fixtures (A8, `data/fixtures/*.json`)
Use the team's sandbox accounts (names and emails only; passwords stay in `.env`). `frontend/src/mock/console.js` has matching demo cases you can copy.

## Should have

### 7. Account and transaction check
`GET /checks?q=<email or transaction id>` → 404 when nothing is found, otherwise:
```json
{ "kind": "Account | Transaction", "title": "...", "sub": "...", "risk": "high", "evidenceStatus": "complete",
  "facts": [["Disputes (90 days)", "5"]], "rows": [{ "kind": "verified", "text": "...", "detail": "..." }],
  "action": "Consider sending the account to the risk team ...", "cases": ["PP-D-41027"] }
```

### 8. Flags
`GET /flags` → `[{ "id", "level": "high | medium", "kind": "Account | Transaction | Delivery", "subject", "text", "when", "query", "case" }]`. `query` is what the frontend passes to `/checks`. Delivery flags (from the A7 delivery watch) send `case` instead, and open that case.

### 9. Assignment and staff
- `POST /cases/{id}/assign` body `{ "staff_id" }`.
- Staff sign-in: PayPal staff SSO in production. For the demo, `GET /auth/me` → `{ "id", "name", "initials", "role" }` with an httpOnly cookie (the frontend sends `credentials: "include"`).

### 10. Audit log
`GET /audit-log` → `[{ "at", "case", "action", "ai", "decision", "by", "notes" }]`, newest first. Rows from the A7 workers use `by: "deadline-watch"` or `"delivery-watch"` and `decision: "Reminder sent"` or `"Flag raised"`.

### 11. Automatic checks (A7, `workers/`)
Both workers only read data, then write flags, reminders and audit rows. They never decide a case or move money (`docs/RULES.md`).
- **Deadline watch** (`workers/deadlines.py`, about every 15 min): read `response_due_date` from PayPal (`get_dispute` in A3), keep `Case.response_deadline` up to date, and for cases due in under 24 h write an `AuditLog` row (`by: "deadline-watch"`, `action: "Deadline reminder: PayPal response due in N h"`, `notes: "Sent to <staff>"`). The queue's "Due in 24 h" view and the red deadlines come from `response_deadline`.
- **Delivery watch** (`workers/delivery_watch.py`, about every 30 min): for open cases with tracking, read the carrier status (`get_tracking` in A4, mock carrier in A8) and save it on the case as `findings.delivery_watch`:
  `{ "carrier": "UPS", "tracking_number": "1Z…", "status": "delivered | in_transit | stalled | not_shipped", "latest_event": "14 Oct 10:42 · Delivered, signed", "last_checked": "<ISO time>", "mismatch": "Carrier says delivered; buyer says not received" | null }`.
  When `mismatch` is set or the parcel is `stalled`, also add a Delivery flag (§8) and an `AuditLog` row (`by: "delivery-watch"`, `decision: "Flag raised"`).
- `GET /workers/status` → `{ "delivery": { "lastRun", "every" }, "deadline": { "lastRun", "every" } }` for the Overview card.

## Nice to have
- `GET /insights` → `{ weeks, opened, closed, reasons: [[label, percent]], stats: { avgHoursToDecision, misunderstandings, aiAgreed, flagsThisWeek }, patterns: [[name, trend, detail]] }`.

## No longer needed
The merchant and buyer endpoints from the earlier plan (Order Help lookup, buyer accept/decline, shipments, merchant settings, merchant stats, personal Scam Check) are not used by the frontend any more.
