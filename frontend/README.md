# Dispute Helper: Frontend

React + Vite. All 34 screens from Figma ("Wireframes v2") run on fake data, so you can click through the whole demo without a backend.

## Run it
Needs Node.js 20.19+ or 22 LTS (`node -v`).

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Go to **http://localhost:5173/screens** for a clickable list of every screen.

## Where things are
| Folder / file | What it is |
|---|---|
| `src/styles/tokens.css` | Colours, fonts, sizes. Change the palette here only. |
| `src/styles/base.css` | Shared styles (cards, buttons, badges, layout helpers) |
| `src/config.js` | Product name, backend URL and mock switch (both read from `.env`) |
| `src/components/` | Building blocks that match the Figma components (Button, Input, Badge, FindingsPanel, charts…) |
| `src/layouts/` | Page frames: landing nav, auth split screen, merchant nav, mobile frame, Order Help frame |
| `src/pages/` | One file per group of screens (landing, auth, onboarding, merchant, individual, scam, orderhelp, extras) |
| `src/mock/data.js` | Fake data for the demo |
| `src/api/index.js` | The only place that talks to the backend |
| `src/App.jsx` | All routes |

## Routes (Figma number → URL)
- 01 `/` · 01b–01d `/features/order-help`, `/features/scam-check`, `/features/dispute-helper` (opened from the feature cards on the landing page)
- 02 `/start` · 03a `/signin` · 03b `/signup/individual` · 03c `/signup/business` · 03d `/signin?reset=1`
- 04–06 `/onboarding/1..3`
- 07 `/merchant` (has the **Formal disputes → Manage disputes** card, which opens `/merchant/inbox?type=dispute`)
- 08 `/merchant/inbox` · 09 + 11 `/merchant/cases/1051` · 10 `/merchant/disputes/PP-D-27891` · 12 `/merchant/risk/1066`
- 13 `/merchant/shipments` · 14 `/merchant/insights` · 15 `/merchant/scam-check` · 16 `/merchant/settings`
- 17 `/me` · 18 `/me/account`
- 19–24 `/scam-check`, `/new`, `/analyzing`, `/questions`, `/result`, `/decision`
- 25 `/store` · 26–32 `/help/diana-richella`, `/problem`, `/answer`, `/waiting`, `/offer`, `/resolved`, `/paypal`
- 33 `/extras/emails` · 34 `/extras/states`

## Connecting the backend
1. Start the FastAPI backend (see the root README). It runs on http://localhost:8000 and already allows http://localhost:5173 through `FRONTEND_ORIGIN`.
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_USE_MOCK=false`.
3. Restart `npm run dev`.

All calls live in `src/api/index.js`. It already uses the backend routes that exist today (`/cases`, `/cases/{id}/approve`, `/order-help`…) and converts the backend `Case` model into what the screens need (`toInboxRow`). Endpoints the UI still needs from the backend are listed in `docs/FRONTEND_BACKEND_GAPS.md`.

Pages don't need to change: they use `useQuery(...)` with `api.*`.

## Rules we follow (docs/RULES.md)
- Nothing that moves money happens without the merchant pressing **Confirm**.
- Risk (low/medium/high) is shown separately from evidence status (complete/partial/missing).
- Every evidence item is labelled Verified, Unverified or Not provided.
- No made-up confidence percentages, and no "fraud confirmed" wording.

## Notes
- Fonts: Inter is bundled through `@fontsource`. Headings use Lil Grotesk (SIL OFL); put its files in `public/fonts/` (see the README there). Without them headings fall back to Inter.
- Background art in `src/assets/art/` comes from the team's Pinterest moodboard. Check the image rights before a public launch, or swap them for our own.
- The build warns that the JS file is large (mostly AG Grid). That's fine for the hackathon.
