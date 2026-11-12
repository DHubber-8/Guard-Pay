# Guard Pay

Guard Pay is a staff console for reviewing PayPal disputes, evidence, delivery signals, account history, and suggested next actions. The console records human decisions and audit entries; its hosted demo uses synthetic data in the browser, while the FastAPI backend provides database-backed routes and PayPal sandbox integrations.

**Live demo:** [guard-pay-five.vercel.app](https://guard-pay-five.vercel.app/)
**Demo guide:** [docs/DEMO.md](docs/DEMO.md)

## Quick start

### A. Console only (`VITE_USE_MOCK=true`)

This is the fastest judge path. It needs Node.js 20.19+ or 22 and uses the sample data bundled in the browser. No backend, database, PayPal credentials, or `.env` file is needed. In mock mode, sign-in is local-only: use any email and password, or create a local demo account. No authentication request is sent.

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

### B. Full backend (`VITE_USE_MOCK=false`)

This is the recommended backend-connected flow. Docker runs PostgreSQL and the FastAPI API together on port 8000. The backend image applies Alembic migrations at startup, and the seed command runs inside the backend container. Set `DEMO_MODE=true` for simulated PayPal reads and refunds.

Use this Docker flow **or** the host-Uvicorn alternative below, never both at the same time. Both try to use port 8000.

**PowerShell**

```powershell
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay
Copy-Item .env.example .env
# Edit .env: set DEMO_MODE=true and choose DEMO_MERCHANT_PASSWORD.
docker compose up -d --build db backend
```

```powershell
docker compose exec backend python -m scripts.seed_demo
```

```powershell
@"
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
"@ | Set-Content frontend\.env
cd frontend
npm install
npm run dev
```

Sign in with the seeded merchant email `demo-merchant@example.test` and the
password configured as `DEMO_MERCHANT_PASSWORD` in the root `.env`. The seed
script does not replace an existing user's password; use a new account through
the sign-up form or reset the local database if an earlier seed used a
different password.

**Bash**

```bash
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay
cp .env.example .env
# Edit .env: set DEMO_MODE=true and choose DEMO_MERCHANT_PASSWORD.
docker compose up -d --build db backend
```

```bash
docker compose exec backend python -m scripts.seed_demo
```

```bash
cat > frontend/.env <<'EOF'
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
EOF
cd frontend
npm install
npm run dev
```

Sign in with `demo-merchant@example.test` and the password configured as
`DEMO_MERCHANT_PASSWORD` in the root `.env`. Existing seeded users keep their
original password; create a new account or reset the local database if needed.

The API is available at `http://localhost:8000`. The console is not connected to every backend route yet; the hosted judge demo therefore uses path A.

#### Optional host-Uvicorn development flow

Use this only when actively developing the Python backend outside its container. Keep the Docker database running, but stop the Docker backend first so port 8000 is free:

```powershell
docker compose stop backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```

In another terminal, seed the host-run API:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m scripts.seed_demo
```

To return to the Docker flow, stop the host Uvicorn process and run
`docker compose up -d --build backend`.

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

Guard Pay's backend has an analysis pipeline, but the normal API flow currently uses deterministic code rather than a model:

- `backend/app/agents/classifier.py` uses an explicit scenario or conservative keyword matching to classify a case.
- `backend/app/rules/scenarios.py` provides merchant and personal scenario catalogs, required evidence, optional evidence, and indicator definitions.
- `backend/app/rules/evidence.py` computes evidence completeness; `risk.py` computes a heuristic warning score from explicitly supplied indicator IDs. The score is not a calibrated probability or fraud verdict.
- `backend/app/agents/explainer.py` produces a fact-grounded explanation, `personal_advisor.py` provides safety steps, and `drafter.py` creates a human-reviewed merchant response draft. These are templates and deterministic functions, not generative model output.
- `backend/app/pipeline.py` combines classification, evidence, risk, assessment, explanations, and findings. It is pure analysis: it does not contact PayPal, change the database, or submit a decision.
- Merchant case analysis currently calls the pipeline with `use_ai=False` in [`backend/app/routes/cases.py`](backend/app/routes/cases.py). Personal checks use the conservative keyword analyzer in [`backend/app/personal_stub.py`](backend/app/personal_stub.py).

There is an optional OpenAI-compatible gateway in [`backend/app/agents/ai_gateway.py`](backend/app/agents/ai_gateway.py). It is disabled by default and is not used by the current merchant analysis route. It would only make a request when `B_AI_ENABLED=1`, `B_AI_BASE_URL`, `B_AI_API_KEY`, and `B_AI_MODEL` are all set; the gateway sends a reduced explanation summary rather than raw case records and applies a prompt against invented evidence, fraud verdicts, and automatic financial recommendations. The current repository does not specify or call a production model.

The hosted frontend's summaries, flags, recommendations, and “AI pick” labels are sample data from [`frontend/src/mock/console.js`](frontend/src/mock/console.js). They demonstrate decision-support wording; they are not evidence of a live AI service.

Guardrails from [`docs/RULES.md`](docs/RULES.md): recommendations only; a human approves every consequential action; no fraud verdicts; no confidence percentages; risk and evidence status remain separate; and a non-recommended action requires a note. Approval and audit routes enforce the human decision boundary before money-moving actions.

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
