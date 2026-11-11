# Guard Pay demo guide

## Hosted demo

Open the [Guard Pay demo](https://guard-pay-five.vercel.app/). The repository also defines a `guard-pay-console` static site in [`render.yaml`](../render.yaml); both use the frontend's bundled sample data. No backend or credentials are required.

Use any email and password on the sign-in screen; mock mode creates a local
session without contacting the backend. Then follow the queue, case, account
check, flags, and audit-log screens. The demo's decisions and information
requests are simulated in the browser; no request is sent to PayPal or the
backend.

## Run the console locally

```powershell
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay\frontend
npm install
npm run dev
```

```bash
git clone https://github.com/DHubber-8/Guard-Pay.git
cd Guard-Pay/frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The sample data starts over when the page is refreshed.

The local console defaults to `VITE_USE_MOCK=true`, so it uses browser sample
data and local-only sign-in. To connect it to the API instead, create
`frontend/.env` with `VITE_API_URL=http://localhost:8000` and
`VITE_USE_MOCK=false`, start the full backend from the root README, and sign in
with `demo-merchant@example.test` plus the configured
`DEMO_MERCHANT_PASSWORD`.

## What is real and what is simulated

The browser demo is sample data from [`frontend/src/mock/console.js`](../frontend/src/mock/console.js). It demonstrates the console experience, recommendation wording, approval interaction, and audit-log presentation, but it does not call PayPal.

The backend's `DEMO_MODE=true` provides simulated PayPal order, dispute, and refund responses from local fixtures. The backend application, database persistence, migrations, approval checks, audit rows, workers, and deterministic mock-carrier endpoint are real local code. A sandbox order created by [`backend/scripts/create_sandbox_order.py`](../backend/scripts/create_sandbox_order.py) is a separate, explicitly live PayPal Sandbox action.

For the full backend setup, see the two-platform commands in the root [README](../README.md).

## Guardrails

The implementation follows [`docs/RULES.md`](RULES.md): recommendations only, human approval for consequential actions, no fraud verdicts, and no confidence percentages. Requests for more information are intended for PayPal's Resolution Center.
