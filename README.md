<!-- Owner: Digant; Status: in progress -->
# PayPalSupport

AI assistant scaffold for helping small merchants resolve PayPal disputes and helping individuals assess suspicious payment requests, unexpected charges, and fake sellers. Merchant and personal modes will share one analysis pipeline.

## Structure

- `backend/`: FastAPI API, PayPal adapters, agents, rules, workers, and tests
- `frontend/`: React/Vite dashboard and placeholder flows
- `docs/`: non-negotiable rules, task board, and contribution workflow
- `data/fixtures/`: synthetic demo data only

## Development

### Backend

Python 3.12 recommended; avoid pre-release versions.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
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

When the backend runs in Docker, it reaches PostgreSQL at the Compose service
hostname `db`; direct local runs use `localhost` instead.

## Deploy to Render

Create a new Render Blueprint from this repository and use `render.yaml`. Render
creates the managed PostgreSQL database and supplies `DATABASE_URL` to the API.
In the API service's Environment dashboard, set the values for `PAYPAL_CLIENT_ID`,
`PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_BASE_URL`,
`PAYPAL_REPORT_URL`, `LLM_API_KEY`, and `FRONTEND_ORIGIN` to the deployed
frontend URL (plus localhost if needed), along with `CARRIER_API_BASE_URL`,
`ELASTIC_URL`, and `ELASTIC_API_KEY` as needed. Keep secrets in the Render
dashboard; do not commit them.

After the deploy finishes, copy the API service's public URL from its Render
Overview page. It will be used later as the PayPal webhook URL in task A2.

## Status

This repository contains minimal application stubs only. Business logic and persistence will be added later.
