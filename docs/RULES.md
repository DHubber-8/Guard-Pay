# Rules

The console is a tool for PayPal staff. Buyers and merchants keep using PayPal as usual; they never use this tool.

- Every money-moving action (refund of any amount, ruling, offer, evidence submission, cancellation) and every account action (limit, hold, closure) needs an explicit staff decision, and each decision is logged: approver id, time, AI recommendation, decision, notes.
- The AI only recommends; it never moves money, rules on a case, submits, cancels, or acts on an account.
- When staff choose something other than the AI's suggestion, they write down why.
- This is decision support, not a verdict; never say "fraud confirmed" or invent probabilities.
- Risk (low/medium/high) is separate from evidence status (complete/partial/missing).
- Evidence is labelled verified (from PayPal or the carrier) or unverified (uploads, messages, screenshots).
- Data comes from PayPal only (disputes, payments, tracking, account and security history). Requests for more information go to the buyer or merchant through PayPal's Resolution Center, never directly.
- Use synthetic or sandbox data only; never commit secrets (including sandbox passwords) or ask anyone for passwords and one-time codes.
