# Task board

Areas: A = Backend and PayPal, B = AI and rules, C = Frontend, S = Shared contracts, P = Postman, D = Docs.  
Status flow: Proposed -> Approved -> In progress -> In review -> Done.  
Priority: Must / Should / Nice.

| ID | Area | Task | Files | Depends on | Priority | Status | Owner | Approved by |
|---|---|---|---|---|---|---|---|---|
| S1 | Shared | Define findings schema and API contract | schemas/findings.py | none | Must | Proposed | TBD | |
| S2 | Shared | Define merchant and personal scenario catalog | rules/scenarios.py | none | Must | Proposed | TBD | |
| A1 | A | Configure PayPal sandbox and order lookup | config.py, paypal/ | none | Must | In progress | Digant | |
| A2 | A | Add verified webhook receiver | routes/webhooks.py | A1 | Must | Proposed | TBD | |
| A3 | A | Add dispute API wrapper | paypal/disputes.py | A1 | Must | Proposed | TBD | |
| A4 | A | Add refund and tracking wrappers | paypal/refunds.py, paypal/tracking.py | A1 | Must | Proposed | TBD | |
| A5 | A | Add database models and sessions | db/ | none | Must | Proposed | TBD | |
| A6 | A | Add order-help, case, approval, and personal routes | routes/ | S1, A5 | Must | Proposed | TBD | |
| A7 | A | Add delivery watch and deadline workers | workers/ | A5, A8 | Should | Proposed | TBD | |
| A8 | A | Add mock carrier, fixtures, and scripts | mocks/, data/, scripts/ | none | Must | Proposed | TBD | |
| A9 | A | Add Render and Docker deployment setup | render.yaml, docker-compose.yml | none | Must | Proposed | TBD | |
| B1 | B | Classify scenarios | agents/classifier.py | S2 | Must | Proposed | TBD | |
| B2 | B | Add explainers and personal advisor | agents/ | S1 | Must | Proposed | TBD | |
| B3 | B | Add evidence rules and document reader | rules/evidence.py, agents/doc_reader.py | S2 | Must | Proposed | TBD | |
| B4 | B | Add merchant and personal risk rules | rules/ | S2 | Should | Proposed | TBD | |
| B5 | B | Combine risk and evidence status | rules/assessment.py | S1 | Must | Proposed | TBD | |
| B6 | B | Add approval policy and audit logging | rules/approval_policy.py | A5 | Must | Proposed | TBD | |
| B7 | B | Draft dispute responses | agents/drafter.py | S1 | Must | Proposed | TBD | |
| B8 | B | Wire the shared pipeline | pipeline.py | B1, B3, B4, B5 | Must | Proposed | TBD | |
| B9 | B | Add optional similar-case search | search/ | A5 | Nice | Proposed | TBD | |
| C1 | C | Add app shell, routing, API client, and home | frontend/src | S1 | Must | Proposed | TBD | |
| C2 | C | Add buyer Order Help screens | buyer/ | C1 | Must | Proposed | TBD | |
| C3 | C | Add merchant inbox | merchant/inbox/ | C1 | Must | Proposed | TBD | |
| C4 | C | Add case view and findings panel | merchant/case/, shared/ | S1, C1 | Must | Proposed | TBD | |
| C5 | C | Add personal mode screens | personal/ | C1, S1 | Should | Proposed | TBD | |
| C6 | C | Add merchant setup screen | merchant/setup/ | C1 | Nice | Proposed | TBD | |
| P1 | P | Add Postman collections and environment | postman/ | A1 | Should | Proposed | TBD | |
| D1 | D | Add rules, README, and demo docs | docs/ | none | Should | Proposed | TBD | |
