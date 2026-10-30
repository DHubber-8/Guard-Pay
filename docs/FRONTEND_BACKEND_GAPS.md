<!-- Owner: Diana; Status: in review -->
# Frontend ↔ backend gaps

The frontend (`frontend/`) has all 34 screens working on mock data. This file lists
what the backend still needs so the screens can run on real data. Task IDs refer to
`docs/TASKS.md`. The frontend calls everything through `frontend/src/api/index.js`;
set `VITE_USE_MOCK=false` in `frontend/.env` to switch to the backend.

Checked against `main` at `5525769` (plus `feat/a2-webhooks`). Updated 30 Oct 2026 after the UI review.

## What already lines up
- CORS: `FRONTEND_ORIGIN` defaults to `http://localhost:5173`, which is the Vite port.
- Routes the frontend already calls: `GET /cases`, `GET /cases/{id}`,
  `POST /cases/{id}/approve`, `POST /cases/{id}/decline`, `POST /order-help`,
  `GET /order-help/{order_id}`, `GET /health`. They currently return stubs.
- The `Case` model fields (`risk_level`, `evidence_status`, `response_deadline`,
  `paypal_dispute_id`, `findings`) map onto the inbox grid (`toInboxRow` in the API file).

## Must have (blocks the demo)

### 1. Findings contract (S1, `schemas/findings.py`)
The file is empty. The frontend expects this shape inside `Case.findings`:
```json
{
  "risk": "low | medium | high | inconclusive",
  "evidence_status": "complete | partial | missing",
  "items": [
    { "text": "Order delivered 27 Oct (DHL)", "status": "verified | unverified | missing | contradiction", "detail": "Matches carrier data" }
  ],
  "suggested_action": "Offer a partial refund of $15 for the damaged mug.",
  "order_number": "#1051",
  "buyer_name": "Maria Gomez",
  "amount": "40.00",
  "currency": "USD"
}
```
No confidence percentages (RULES.md: "never invent probabilities").

### 2. Case routes return real data (A6, `routes/cases.py`)
- `GET /cases?type=dispute|orderhelp|risk|delivery` returns a list of `Case` rows (fields as in `db/models.py`) with `findings` filled.
- `GET /cases/{id}` additionally returns `order`, `evidence_items`, `offers`, and a `timeline` list: `[{ "date": "2026-10-12", "text": "Order paid · $64.00", "alert": false }]`.

### 3. Approve / decline (A6 + B6, `routes/approvals.py`)
- Body: `{ "offer": "partial | full | replace", "amount": "15.00", "message": "optional text to the buyer" }`.
- Must write an `Approval` row and an `AuditLog` row, then call `paypal/refunds.py` only after approval.
- Response: `{ "case_id": "...", "decision": "approve", "status": "refund_sent", "refund_id": "..." }`.

### 4. Order Help for buyers (A6 + B2, `routes/order_help.py`)
- `POST /order-help/lookup` body `{ "order_number": "#1032", "email": "buyer@mail.com" }` → order summary + tracking steps, or 404 (the UI shows "We couldn't find that order").
- `POST /order-help` body `{ "order_number", "email", "reason": "not_arrived | damaged | not_as_described | cancel | other", "not_arrived_reason": "delivered | stuck | customs | late | address | notracking", "note", "photos": [] }`.
  `not_arrived_reason` is only sent when `reason` is `not_arrived` (PayPal has a single
  "item not received" reason, so we ask why and check it against tracking). The frontend
  expects an instant answer for `customs | late | stuck | notracking`; `delivered` and
  `address` go to the seller. Store it on the case so the dispute view can show
  "why the buyer says it didn't arrive" (`why` text on the dispute). → either an instant answer `{ "type": "answer", "explanation", "tracking_steps": [...] }` or `{ "type": "sent_to_seller", "reply_due": "ISO datetime" }`.
- `GET /order-help/{id}` → status `waiting | offer | resolved`, plus the seller's offer when there is one.
- `POST /order-help/{id}/accept` and `/decline` (buyer side).
- `POST /order-help/{id}/message` body `{ "text" }` (buyer → seller, "Message the seller"), and the seller's reply in `GET /order-help/{id}` as `seller_reply: { text, sent_at }`.

### 5. Personal Scam Check (A6 + B2, `routes/personal.py`, currently empty)
- `POST /personal/checks` body `{ "description", "link_or_sender", "screenshots": [] }` → `{ "id", "follow_up_questions": ["..."] }` (max 2 rounds).
- `POST /personal/checks/{id}/answers` body `{ "answers": ["..."] }` → findings (same contract as S1, with `reasons` and `safe_steps` lists).
- `POST /personal/checks/{id}/decision` body `{ "decision": "resolved | monitor | report" }`.
- `GET /personal/checks` → history for the signed-in individual: `[{ id, title, date, risk, decision }]` (used by `/me` and the new `/me/history` page, which also replaces "Download my data").

### 6. Dispute wrappers (A3, `paypal/disputes.py`)
`get_dispute` is a stub. Needed: list disputes, get one, provide evidence, make offer (via httpx; the Agent Toolkit doesn't cover evidence/offers).

### 7. Fixtures (A8, `data/fixtures/*.json`)
All four files are `[]`. The frontend mock data in `frontend/src/mock/data.js` can be copied as a starting point (orders #1032, #1045, #1051, #1066, buyer names, tracking steps).

## Should have

### 8. Merchant profile and settings
No `merchants` table yet. Needed: `GET /merchant`, `PATCH /merchant` with
`{ name, website, support_email, logo_url, auto_approve_limit, tone: "friendly | formal", review_ai_explanations, auto_delivery_updates, notifications: { instant, summary: "off | daily | weekly | monthly | yearly", deadline_email }, channels: { email, link, qr, widget } }`.
- The summary email needs a scheduled job per frequency (daily / weekly on Monday / monthly on the 1st / yearly in January).
- Order Help channels: `GET /merchant/order-help-channels` → `{ link: "https://…/help/<store-slug>", widget_snippet: "<script …>", forwarding_email: "help+<slug>@…" }`. The QR code is drawn in the browser from `link`.
- Tone preview: optional `POST /merchant/tone-preview` body `{ tone }` → `{ text }`; the frontend has fixed sample texts until then.

### 9. Dashboard numbers
`GET /merchant/stats` → `{ open_cases, due_today, waiting_approval, oldest_waiting_hours, disputes_prevented, answered_instantly, risky_orders_flagged, misunderstandings_cleared, avg_minutes_to_solve, open_disputes, next_dispute_due_days }`.
"Money recovered" was removed from the UI and replaced by `answered_instantly` (home) and `risky_orders_flagged` (insights).

### 9b. PayPal connection status
The dashboard and Settings → PayPal show a blue banner when PayPal is disconnected. Needed:
`GET /merchant/paypal` → `{ connected: true, account_email, connected_at }`,
`POST /merchant/paypal/connect` → `{ redirect_url }` (PayPal onboarding / OAuth), `POST /merchant/paypal/disconnect`.

### 10. Shipments (A7, `workers/delivery_watch.py`)
No `shipments` table yet (only `orders.tracking_number` / `carrier`). Needed: `GET /shipments` → `[{ order, buyer, carrier, shipped_at, expected_at, delivered_at, status: "on_time | delayed | customs | failed | delivered", drafted_message }]` and `POST /shipments/{order}/message`.

### 11. Risk alerts (B4, 1A flow)
`GET /cases/{id}` for a risk case should include `reasons: []` and `actions: ["sign", "confirm", "cancel"]`; `POST /cases/{id}/risk-action` body `{ "action" }`. The AI never cancels on its own.

### 12. Auth
No login yet. Frontend has sign-in / sign-up screens and fakes the session in `src/session.js`. Needed: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` → `{ role: "merchant | individual", name }`, using an httpOnly cookie (the frontend already sends `credentials: "include"`). `allow_credentials=True` is already set in CORS.

### 12b. Account pages
- `PATCH /me` body `{ name, email, notifications }` for the individual account page ("Save changes").
- Merchant scam check (`/merchant/scam-check`) uses the same `POST /personal/checks` contract; the result should include `flags: [{ text, why }]` so the email screenshot can be highlighted.

## Nice to have
- `GET /insights?days=7|30|90` → weekly counts, top reasons, most problematic products.
- `POST /uploads` for photos and screenshots → `{ file_ref }` (used by evidence, Order Help and Scam Check).
- Merge `feat/a2-webhooks` so new PayPal disputes appear in the inbox.

## Not needed from the backend
Email templates, landing page, feature pages and empty/loading/error states are frontend only.
