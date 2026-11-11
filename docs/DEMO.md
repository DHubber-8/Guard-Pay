# Judge demo guide

Dispute Helper is a PayPal staff console for reviewing disputes, evidence, delivery signals, and suggested actions. Staff can record an approval or decline, while every decision and worker reminder is written to the audit trail. The local demo uses synthetic fixtures and simulated PayPal reads/refunds so it can be evaluated without PayPal credentials.

## Hosted demo

Open: **<HOSTED_URL>**

The demo login details are provided in the submission form. Do not copy credentials
into this repository or into screenshots.

## Three-minute path

1. Open the merchant inbox/queue and choose the seeded hand-cream case.
2. Read the findings, evidence, suggested action, and case timeline.
3. Approve a **partial refund** and confirm that the approval and refund appear in
   the audit/timeline. In demo mode the refund is simulated and its identifier
   starts with `SIMULATED-`.
4. Open the delivery/shipment view and inspect the on-time, delayed, and delivered
   tracking examples.
5. Open Personal Scam Check, enter a synthetic description and link/sender, answer
   the follow-up questions, and review the conservative risk guidance.

## What is real and what is simulated

Real in demo mode:

- The FastAPI application, database persistence, authentication, sessions, case
  and approval rules, audit rows, worker logic, frontend rendering, and seeded
  fixture data.
- The mock carrier endpoint and its deterministic tracking patterns.
- Approval ordering: the Approval and initial AuditLog rows are committed before
  the simulated refund result is recorded.

Simulated in demo mode:

- PayPal order reads, dispute reads/listing, and refunds. No PayPal HTTP request
  is made, and simulated responses are marked `simulated: true`.
- Carrier responses are synthetic; they do not represent a real shipment.
- The findings and personal-check examples are decision support, not fraud
  verdicts, and do not contact buyers or merchants.

## Run it yourself

### Windows PowerShell

Verified against the repository's `docker-compose.yml`, `backend/alembic.ini`,
`backend/scripts/seed_demo.py`, `backend/requirements-dev.txt`, and
`frontend/package.json`:

```powershell
git clone <REPOSITORY_URL>
cd potential-Pay-Palling
Copy-Item .env.example .env
```

Edit `.env` and set:

```dotenv
DEMO_MODE=true
DEMO_MERCHANT_PASSWORD=<LOCAL_MERCHANT_PASSWORD>
DEMO_INDIVIDUAL_PASSWORD=<LOCAL_INDIVIDUAL_PASSWORD>
```

Then run the database and backend:

```powershell
docker compose up -d db
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m alembic -c alembic.ini upgrade head
python -m scripts.seed_demo
uvicorn app.main:app --reload
```

In a second PowerShell window, start the frontend:

```powershell
cd potential-Pay-Palling\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:8000` and `VITE_USE_MOCK=false` in
`frontend/.env` to use the backend demo.

### macOS/Linux

Verified against the same repository files and scripts:

```bash
git clone <REPOSITORY_URL>
cd potential-Pay-Palling
cp .env.example .env
```

Edit `.env` and set:

```dotenv
DEMO_MODE=true
DEMO_MERCHANT_PASSWORD=<LOCAL_MERCHANT_PASSWORD>
DEMO_INDIVIDUAL_PASSWORD=<LOCAL_INDIVIDUAL_PASSWORD>
```

Then run the database and backend:

```bash
docker compose up -d db
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
python -m alembic -c alembic.ini upgrade head
python -m scripts.seed_demo
uvicorn app.main:app --reload
```

In a second terminal, start the frontend:

```bash
cd potential-Pay-Palling/frontend
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:8000` and `VITE_USE_MOCK=false` in
`frontend/.env`.

To reset the local synthetic data, run from `backend`:

```powershell
python -m scripts.reset_demo --yes
```

```bash
python -m scripts.reset_demo --yes
```

## Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `ENV` | No; defaults to `local` | Runtime environment. |
| `DEMO_MODE` | Yes for credential-free demo; otherwise no | Enables simulated PayPal reads/refunds. Keep `false` for real PayPal mode. |
| `DATABASE_URL` | No locally; required in production | Database connection. Compose supplies the backend container's database URL. |
| `PAYPAL_CLIENT_ID` | No in demo mode; required for real PayPal calls | PayPal API client ID. |
| `PAYPAL_CLIENT_SECRET` | No in demo mode; required for real PayPal calls | PayPal API client secret. |
| `PAYPAL_WEBHOOK_ID` | No in demo mode; required for webhook verification | PayPal webhook identifier. |
| `PAYPAL_BASE_URL` | No; sandbox default | PayPal API base URL. |
| `PAYPAL_REPORT_URL` | No | Optional PayPal reporting URL. |
| `FRONTEND_ORIGIN` | No locally; required for deployed browser access | Comma-separated allowed frontend origins. |
| `CARRIER_API_BASE_URL` | No | Carrier endpoint; empty uses the in-process mock. |
| `SESSION_SECRET` | No locally; required in production | Signs authentication cookies. |
| `SESSION_TTL_SECONDS` | No | Session lifetime; defaults to 86400 seconds. |
| `DEMO_MERCHANT_PASSWORD` | Required to seed a local merchant login | Password for the synthetic merchant user; choose it locally. |
| `DEMO_INDIVIDUAL_PASSWORD` | Optional | Password for the synthetic individual user; choose it locally. |
| `ADMIN_TOKEN` | Optional | Enables protected demo reseeding and worker execution. |
| `WORKERS_ENABLED` | No | Enables the background delivery worker loop; defaults to `false`. |
| `WORKERS_INTERVAL_SECONDS` | No | Background worker interval; defaults to `300`. |
| `DEV_LOGS_ENABLED` | No; defaults to `false` | Enables the protected `/dev` developer log page and diagnostic storage. |
| `DEV_LOGS_RETENTION_HOURS` | No; defaults to `24` | Retention window for developer logs. |
| `DEV_LOGS_MAX_ROWS` | No; defaults to `5000` | Maximum retained developer log rows. |
| `LLM_API_KEY` | No | Reserved optional integration key; not needed by the demo stub. |
| `ELASTIC_URL` | No | Optional search service URL. |
| `ELASTIC_API_KEY` | No | Optional search service key. |
| `VITE_API_URL` | No; defaults to `http://localhost:8000` | Frontend backend URL. |
| `VITE_USE_MOCK` | No; set to `false` for backend demo | `true` uses frontend-only mock data; `false` calls FastAPI. |

Never put real credentials in this document, a committed `.env`, or a Postman
export.

### Developer logs

Developer logs are disabled by default. For local troubleshooting, set
`DEV_LOGS_ENABLED=true`, configure a private `ADMIN_TOKEN`, run the latest
Alembic migration, and open `/dev`. Enter the admin token in the page; it is
kept in browser memory only. Logs are redacted and automatically pruned, but
keep the feature off on the hosted demo unless you are actively diagnosing a
private environment. Never share the admin token or expose `/dev` publicly.

## Troubleshooting

### Port 5432 is already in use

Another PostgreSQL service is using the host port. Stop it, or change the left
side of the Compose mapping from `5432:5432` to another host port and update
your local `DATABASE_URL` if you run the backend outside Docker.

### Password authentication failed

The Compose database uses the credentials declared in `docker-compose.yml`:
database/user `dispute_helper` and password `dispute_helper`. Remove the local
Compose volume only if it contains an old incompatible initialization, then
restart the database; this deletes local database data:

```powershell
docker compose down -v
docker compose up -d db
```

```bash
docker compose down -v
docker compose up -d db
```

### CORS errors

Ensure `.env` has `FRONTEND_ORIGIN=http://localhost:5173`, ensure the frontend
uses `VITE_API_URL=http://localhost:8000`, and restart both development servers.
The backend permits the configured origins, not arbitrary browser origins.

### Free-tier cold start

The hosted Render service may take several seconds to wake after inactivity.
Retry `/health`, then `/health/ready`, before opening the console. A readiness
failure means the database probe failed; it is separate from the liveness check.

## Verification note

The commands and paths above were checked against the repository files listed at
the start of the local-run sections. They were not executed as part of writing
this document, so Docker daemon availability, installed Python/Node versions,
database startup, hosted URL availability, and submission-form logins remain
unverified here.
