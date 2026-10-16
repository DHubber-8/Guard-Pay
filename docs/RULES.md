# Rules

- Every money-moving action needs explicit human approval, and each approval is logged.
- The AI only recommends; it never moves money, submits, or cancels.
- This is decision support, not a verdict; never say “fraud confirmed” or invent probabilities.
- Risk (low/medium/high) is separate from evidence status (complete/partial/missing).
- Evidence is labelled verified or unverified.
- Use only data PayPal exposes and the appropriate store or user-provided history.
- Use synthetic data only; never commit secrets or request passwords and one-time codes.
- Buyer-facing explanations that move no money may be sent immediately but also appear in the merchant inbox.
