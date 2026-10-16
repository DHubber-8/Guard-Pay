# PayPalSupport

AI assistant scaffold for helping small merchants resolve PayPal disputes and helping individuals assess suspicious payment requests, unexpected charges, and fake sellers. Merchant and personal modes will share one analysis pipeline.

## Structure

- `backend/`: FastAPI API, PayPal adapters, agents, rules, workers, and tests
- `frontend/`: React/Vite dashboard and placeholder flows
- `docs/`: non-negotiable rules, task board, and contribution workflow
- `data/fixtures/`: synthetic demo data only

## Development

### Backend

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

## Status

This repository contains minimal application stubs only. Business logic and persistence will be added later.
