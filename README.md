# Guard Pay

Guard Pay is a staff console for reviewing PayPal disputes, evidence, delivery signals, account history, and suggested next actions. The console records human decisions and audit entries; its hosted demo uses synthetic data in the browser, while the FastAPI backend provides database-backed routes and PayPal sandbox integrations.

**Live demo:** [guard-pay-five.vercel.app](https://guard-pay-five.vercel.app/)
**Demo guide:** [docs/DEMO.md](docs/DEMO.md)

## Quick start

### A. Console only (fastest judge path)

This path needs Node.js 20.19+ or 22. It uses the sample data bundled in the browser: no backend, database, credentials, or `.env` file is needed.

**PowerShell**

```powershell
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay\frontend
npm install
npm run dev
```

**Bash**

```bash
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### B. Full backend

This path runs PostgreSQL, the FastAPI API, Alembic migrations, and synthetic seed data. Set `DEMO_MODE=true` in `.env` for credential-free simulated PayPal reads and refunds. The `uvicorn` command stays running, so run the seed command in a second terminal after the API starts.

**PowerShell**

```powershell
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay
Copy-Item .env.example .env
# Set DEMO_MODE=true and choose DEMO_MERCHANT_PASSWORD in .env
docker compose up -d db
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```

In a second PowerShell terminal:

```powershell
cd Guard-Pay\backend
.venv\Scripts\Activate.ps1
python -m scripts.seed_demo
```

**Bash**

```bash
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay
cp .env.example .env
# Set DEMO_MODE=true and choose DEMO_MERCHANT_PASSWORD in .env
docker compose up -d db
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
python -m alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```

In a second Bash terminal:

```bash
cd Guard-Pay/backend
. .venv/bin/activate
python -m scripts.seed_demo
```

The API is available at `http://localhost:8000`. The console is not connected to every backend route yet; the hosted judge demo therefore uses path A.

## How we use PayPal

| PayPal touchpoint | Implementation | Sandbox/live status | `DEMO_MODE` behavior |
|---|---|---|---|
| OAuth and authenticated REST requests | [`backend/app/paypal/client.py`](backend/app/paypal/client.py) | Calls the configured PayPal base URL; `.env.example` defaults to the sandbox URL. | Not used for the simulated calls. |
| Webhook receiver and signature verification | [`backend/app/routes/webhooks.py`](backend/app/routes/webhooks.py) | The receiver sends PayPal's transmission fields and event to PayPal's verification endpoint before recording it. | Manual sample events without a real signature are rejected; the demo console does not send webhooks. |
| Disputes API list, lookup, and dispute actions | [`backend/app/paypal/disputes.py`](backend/app/paypal/disputes.py) | Uses PayPal customer-dispute endpoints when demo mode is off. | Returns fixture-shaped simulated disputes; simulated responses are marked. |
| Orders lookup | [`backend/app/paypal/orders.py`](backend/app/paypal/orders.py) | Uses Orders v2 when demo mode is off. | Reads local JSON fixtures and marks the result simulated. |
| Capture lookup, refunds, and idempotency | [`backend/app/paypal/refunds.py`](backend/app/paypal/refunds.py) | Reads captures and submits refunds when demo mode is off; refunds send a deterministic `PayPal-Request-Id`. | Returns a simulated refund result and makes no PayPal request. |
| Order tracking | [`backend/app/paypal/tracking.py`](backend/app/paypal/tracking.py) | Adds tracking through Orders v2 when demo mode is off; reads order tracking through the Orders wrapper. | The backend's carrier endpoint is synthetic and read-only; it is not PayPal shipment data. |
| Sandbox order/capture/tracking script | [`backend/scripts/create_sandbox_order.py`](backend/scripts/create_sandbox_order.py) | Creates and captures an explicitly live PayPal sandbox order, then can add tracking after approval. | Not a demo-mode operation. |
| Sandbox dispute checklist | [`backend/scripts/dispute_checklist.py`](backend/scripts/dispute_checklist.py) | Guides a human to open a dispute in the PayPal Sandbox Resolution Center; it does not create disputes through an API. | Uses the local synthetic fixture text. |

Requests for more information are intended to go to the buyer or merchant through PayPal's Resolution Center, not directly from Guard Pay. The backend's dispute wrapper exposes PayPal dispute messaging; the hosted browser demo simulates that result.

## How we use AI

No AI model is called today. The current implementation uses deterministic rules and sample findings to provide decision support:

- Backend rule modules evaluate risk, evidence, assessments, approval policy, personal checks, and auto-approval behavior.
- The frontend sample data displays summaries, flags, recommended actions, and an “AI pick” label.
- Approval gating requires a human approver for money-moving or other consequential actions, and decisions are written to the audit log.
- The hosted console's cases, account checks, flags, insights, and recommendations are sample data from [`frontend/src/mock/console.js`](frontend/src/mock/console.js).

Guardrails from [`docs/RULES.md`](docs/RULES.md): recommendations only; a human approves every action; the system does not issue fraud verdicts; and it does not show confidence percentages. Risk and evidence status remain separate, and choosing a non-recommended action requires a note.

> **TODO: real AI step**
>
> If a model is added, document the exact model/provider here and describe its role, inputs, outputs, and evaluation boundary. Do not describe a model as active until the code calls it.

## Tech stack and tools

- **Backend:** Python 3.11+ project, FastAPI, Pydantic Settings, SQLAlchemy, HTTPX, and Uvicorn.
- **Frontend:** React 19, React Router, TanStack Query, AG Grid, Lucide React, and Vite.
- **Database:** PostgreSQL 16.
- **Migrations:** Alembic.
- **Testing:** pytest and the backend test suite in `backend/tests/`.
- **Containers:** Docker and Docker Compose; the backend image uses Python 3.12.
- **Hosting:** Render Blueprint with a Docker API service, managed PostgreSQL database, and static frontend service.
- **Development tools:** Postman collections, Git, npm, Python virtual environments, and the included synthetic fixtures/scripts.

## Sponsor integrations

### Render

[`render.yaml`](render.yaml) defines both deployed services:

- `dispute-helper-api`: Dockerized FastAPI service rooted at `backend`, backed by the managed `dispute-helper-db` PostgreSQL database.
- `guard-pay-console`: static Vite site rooted at `frontend`, built with `npm ci && npm run build`, with SPA rewrites.

### Postman

The [`postman/`](postman/) directory contains collections for the PayPal sandbox, carrier mock, and Guard Pay API, plus `local.environment.json`. In Postman, import all three collection JSON files and the environment, select `local`, fill in local URLs/IDs/credentials, then run the requests in the order documented in [`postman/README.md`](postman/README.md). The PayPal collection's **Get token** request stores its token for later requests. Do not export credentials.

## Deploy to Render

Create a Render Blueprint from this repository and apply [`render.yaml`](render.yaml). The API service requires these environment variables:

| Variable | Required on Render | Purpose |
|---|---:|---|
| `ENV` | Set by Blueprint | `production`. |
| `DATABASE_URL` | Supplied by Blueprint | Managed PostgreSQL connection. |
| `PAYPAL_CLIENT_ID` | Yes | PayPal API client ID. |
| `PAYPAL_CLIENT_SECRET` | Yes | PayPal API client secret. |
| `PAYPAL_WEBHOOK_ID` | Yes for verified webhooks | PayPal webhook identifier. |
| `SESSION_SECRET` | Yes | Generated by Render; signs authentication cookies. |
| `PAYPAL_BASE_URL` | Set by Blueprint | PayPal Sandbox API URL. |
| `DEMO_MODE` | Set by Blueprint | `false` for the deployed API. |
| `DEMO_MERCHANT_PASSWORD` | Configure if seeding synthetic merchant access | Synthetic local/demo seed password. |
| `DEMO_INDIVIDUAL_PASSWORD` | Configure if seeding synthetic individual access | Synthetic local/demo seed password. |
| `PAYPAL_REPORT_URL` | Optional | PayPal reporting URL. |
| `LLM_API_KEY` | Optional/reserved | No model is called by the current code. |
| `FRONTEND_ORIGIN` | Yes | URL(s) allowed by API CORS; include the console URL. |
| `CARRIER_API_BASE_URL` | Optional | Public mock-carrier URL if using the HTTP carrier path. |
| `ELASTIC_URL` | Optional | Search service URL. |
| `ELASTIC_API_KEY` | Optional | Search service key. |
| `ADMIN_TOKEN` | Optional | Protects admin reseeding/worker operations. |
| `WORKERS_ENABLED` | Set by Blueprint | Background worker switch. |
| `WORKERS_INTERVAL_SECONDS` | Set by Blueprint | Worker interval. |
| `DEV_LOGS_ENABLED` | Set by Blueprint | Developer log switch. |
| `DEV_LOGS_RETENTION_HOURS` | Set by Blueprint | Developer log retention. |
| `DEV_LOGS_MAX_ROWS` | Set by Blueprint | Developer log row limit. |

The static `guard-pay-console` service uses `NODE_VERSION=22` and `VITE_USE_MOCK=true`, so it serves the browser sample-data demo. After deployment, set the API's `FRONTEND_ORIGIN` to the static site's URL and use the API service URL for PayPal webhook configuration.

## License

Guard Pay is released under the [MIT License](LICENSE).
