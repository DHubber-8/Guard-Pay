# Guard Pay: Frontend (staff console)

React + Vite. A console for **PayPal staff** who resolve disputes. Disputes come in from PayPal; the console shows the AI's summary, flags and suggested resolution, and staff make and log every decision. Everything runs on demo data, so you can click through without a backend.

## Run it
Needs Node.js 20.19+ or 22 LTS (`node -v`).

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173.

Demo data lives in memory, so refreshing the page resets decisions and requests.

## Screens
| URL | Screen |
|---|---|
| `/signin` | Staff sign in (PayPal staff SSO; demo button signs in as Diana R.) |
| `/` | Overview: today's workload, my most urgent cases, new flags |
| `/queue` | Dispute queue (AG Grid). Views: `?view=mine`, `due`, `high`, `waiting`, `resolved` |
| `/cases/:id` | Case workspace: AI summary, evidence by side, PayPal timeline, both accounts, flags, decision, request info, audit |
| `/checks?q=` | Account or transaction check (email or transaction ID) |
| `/flags` | Accounts and transactions flagged outside disputes |
| `/insights` | Team numbers and patterns |
| `/audit` | Every decision with approver, AI suggestion and notes |
| `/extras/states` | Empty, loading, error and not-found states |

The search box in the top bar opens a case for a case ID (`PP-D-…`) and an account check for anything else.

## Where things are
| Folder / file | What it is |
|---|---|
| `src/styles/tokens.css` | Colours, fonts, sizes (PayPal-style blues) |
| `src/styles/base.css` | Shared styles: cards, buttons, badges, tables, layout helpers |
| `src/styles/console.css` | The console shell: sidebar, top bar, case workspace |
| `src/config.js` | Product name, backend URL and mock switch (read from `.env`) |
| `src/components/` | Building blocks (Button, Badge, Modal, RadioCard, FindingsPanel, charts…) |
| `src/layouts/ConsoleLayout.jsx` | Sidebar, top bar and search |
| `src/pages/console/` | One file per screen |
| `src/mock/console.js` | Demo data based on the team's sandbox accounts (names and emails only) |
| `src/api/index.js` | The only place that talks to the backend, plus the demo backend |
| `src/labels.js` | Shared labels and formatting |

## Connecting the backend
1. Start the FastAPI backend (see the root README). It runs on http://localhost:8000 and allows http://localhost:5173 through `FRONTEND_ORIGIN`.
2. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_USE_MOCK=false`.
3. Restart `npm run dev`.

`src/api/index.js` converts the backend `Case` model into what the screens need (`toQueueRow`, `toCaseDetail`). What the backend still needs is in `docs/FRONTEND_BACKEND_GAPS.md`.

## Rules we follow (docs/RULES.md)
- The AI only recommends. Every refund, ruling or account action needs a staff decision, and every decision is logged.
- Staff who choose something other than the AI's suggestion must write down why.
- Risk is shown separately from evidence status, and every evidence item is labelled verified or not.
- No made-up percentages and no "fraud confirmed" wording.
- Buyers and merchants are only contacted through PayPal.

## Notes
- Fonts: Inter (bundled through `@fontsource`) for text, Lil Grotesk (SIL OFL, in `public/fonts/`) for headings.
- The build warns that the JS file is large (mostly AG Grid). That's fine for the hackathon.
