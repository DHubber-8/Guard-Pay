<!-- Owner: Digant; Status: in progress -->
# PayPalSupport

[Judge demo instructions](docs/DEMO.md) — hosted URL, three-minute walkthrough,
credential-free local setup, environment variables, and troubleshooting.

AI assistant for PayPal staff who resolve disputes. Disputes arrive from PayPal (webhooks and the Disputes API); the system pulls the order, tracking, evidence and account history from PayPal, flags anything suspicious, and suggests a resolution. Staff can also check any account or transaction for fraud signals. A person makes every decision, and every decision is logged.

## Structure

- `backend/`: FastAPI API, PayPal adapters, agents, rules, workers, and tests
- `frontend/`: React/Vite staff console (dispute queue, case workspace, account check, flags, insights, audit log)
- `docs/`: non-negotiable rules, task board, and contribution workflow
- `data/fixtures/`: synthetic demo data only

## Development

### Backend

Python 3.12 recommended; avoid pre-release versions.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The local PostgreSQL service can be started with `docker compose up -d`.

See [docs/RULES.md](docs/RULES.md), [docs/TASKS.md](docs/TASKS.md), and [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Sandbox credentials belong in `.env` and must never be committed.

## Run locally

Copy `.env.example` to `.env`, then fill in the PayPal and optional integration values.
Start PostgreSQL with Docker Compose:

```powershell
docker compose up -d db
```

Run the backend directly from the repository root:

```powershell
cd backend
uvicorn app.main:app --reload
```

The optional containerized backend can be started with `docker compose up backend`.
The API is available at `http://localhost:8000`.

### Synthetic demo tools

All demo data is synthetic and local-only. From `backend`:

```powershell
python -m scripts.seed_demo
python -m scripts.dispute_checklist
python -m scripts.reset_demo --yes
Invoke-RestMethod http://localhost:8000/mock-carrier/tracking/DEMO-DELIVERED-001
```

The mock carrier recognizes `DELIVERED`, `IN_TRANSIT`, `STUCK-<N>`, and `LOST`
tracking-number patterns. It always labels responses as mock data. Creating a
PayPal sandbox order is an explicit live-sandbox action:

```powershell
python -m scripts.create_sandbox_order
```

Use `--tracking-number`, `--carrier`, `--actor-id`, and `--case-id` together to
add tracking after capture. Sandbox order and capture IDs are written to the
gitignored `backend/scripts/out/orders.json`.

When the backend runs in Docker, it reaches PostgreSQL at the Compose service
hostname `db`; direct local runs use `localhost` instead.

To send a sample event to the local webhook endpoint from PowerShell:

```powershell
$event = @{
  id = "WH-SAMPLE-1"
  event_type = "CUSTOMER.DISPUTE.CREATED"
  resource = @{ dispute_id = "PP-DISPUTE-SAMPLE-1"; status = "OPEN" }
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri http://localhost:8000/webhooks/paypal `
  -ContentType "application/json" -Body $event
```

Hand-made requests do not contain a real PayPal signature, so strict signature
verification will reject this sample. A real end-to-end test requires an actual
PayPal sandbox dispute and the corresponding configured webhook.

## Deploy to Render

Create a new Render Blueprint from this repository and use `render.yaml`. Render
creates the managed PostgreSQL database and supplies `DATABASE_URL` to the API.
In the API service's Environment dashboard, set the values for `PAYPAL_CLIENT_ID`,
`PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_BASE_URL`,
`PAYPAL_REPORT_URL`, `LLM_API_KEY`, and `FRONTEND_ORIGIN` to the deployed
frontend URL (plus localhost if needed), along with `CARRIER_API_BASE_URL`,
`ELASTIC_URL`, and `ELASTIC_API_KEY` as needed. Keep secrets in the Render
dashboard; do not commit them.

Set `CARRIER_API_BASE_URL` to the public mock-carrier path on this service:
`https://<your-service>.onrender.com/mock-carrier`. The endpoint is read-only,
synthetic, and labels every response with `"mock": true`; delivery-watch
polling can request `/tracking/{tracking_number}` from this base URL.

After the deploy finishes, copy the API service's public URL from its Render
Overview page. It will be used later as the PayPal webhook URL in task A2.

## Status

The repository now contains a working FastAPI backend with authentication,
PayPal webhook and API wrappers, case/order-help/personal/approval routes,
delivery and deadline workers, synthetic fixtures, resettable hosted demo data,
Docker/Render deployment configuration, and Postman collections. The AI/rules
pipeline and several frontend-to-live-backend integrations remain future work.

## Backend run order

From the repository root:

```powershell
Copy-Item .env.example .env
docker compose up -d db
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m alembic -c alembic.ini upgrade head
uvicorn app.main:app --reload
```

In another terminal, with the backend environment active:

```powershell
cd backend
python -m scripts.seed_demo
```

The seed is synthetic and local-only. Reset it with:

```powershell
python -m scripts.reset_demo --yes
```

The hosted equivalent is `POST /admin/reseed-demo`, protected by
`X-Admin-Token` when `ADMIN_TOKEN` is configured. It removes only marked demo
rows and preserves real PayPal disputes and audit history.

Important environment variables include `DATABASE_URL`, `ENV`,
`DEMO_MODE` (local simulated PayPal reads/refunds),
`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`,
`PAYPAL_BASE_URL`, `FRONTEND_ORIGIN`, `CARRIER_API_BASE_URL`, `SESSION_SECRET`,
`SESSION_TTL_SECONDS`, `ADMIN_TOKEN`, `WORKERS_ENABLED`, and
`WORKERS_INTERVAL_SECONDS`. Keep secrets in `.env` or the deployment provider;
never commit them. Production requires `SESSION_SECRET`.

The mock carrier is read-only and synthetic:

```powershell
Invoke-RestMethod http://localhost:8000/mock-carrier/tracking/DELIVERED-72H
Invoke-RestMethod http://localhost:8000/mock-carrier/tracking/STUCK-5
```

It recognizes `DELIVERED`, `DELIVERED-<hours>H`, `IN_TRANSIT`, `STUCK-<N>`,
and `LOST`. Delivery watch uses the in-process mock when
`CARRIER_API_BASE_URL` is empty, or the configured `/mock-carrier` HTTP endpoint
when it is set.
