// All data access goes through here. Pages call these with useQuery(), e.g.
//   const { data, isLoading } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
//
// Matches the FastAPI backend in /backend (routes have no /api prefix).
// While USE_MOCK is true (default) the fake data in src/mock is returned.
// Set VITE_USE_MOCK=false in frontend/.env to call the real backend.
//
// Endpoints marked "NOT IN BACKEND YET" are what the UI needs; see
// docs/FRONTEND_BACKEND_GAPS.md for the list handed to the backend team.
import { USE_MOCK, API_URL } from "../config";
import * as mock from "../mock/data";

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const fake = (value) => async () => { await wait(); return value; };

async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/* ---------- Adapters: backend shape -> what the screens use ---------- */
// backend Case (db/models.py): id, mode, scenario, status, paypal_dispute_id,
// order_id, findings, risk_level, evidence_status, overall_assessment, response_deadline
const SCENARIO_TYPE = (c) => (c.paypal_dispute_id ? "dispute" : c.scenario?.startsWith("risk") ? "risk" : c.scenario?.startsWith("delivery") ? "delivery" : "orderhelp");

// Where each case type opens. Deliveries live on the shipments page.
const CASE_LINK = {
  dispute: (c) => `/merchant/disputes/${c.id}`,
  risk: (c) => `/merchant/risk/${c.id}`,
  orderhelp: (c) => `/merchant/cases/${c.id}`,
  delivery: (c) => `/merchant/cases/${c.id}`,
};

export function toInboxRow(c) {
  const type = SCENARIO_TYPE(c);
  const due = c.response_deadline ? new Date(c.response_deadline) : null;
  const hours = due ? Math.round((due - Date.now()) / 36e5) : 999;
  return {
    id: String(c.id),
    type,
    title: c.overall_assessment || c.scenario,
    buyer: c.findings?.buyer_name ?? "–",
    order: c.findings?.order_number ?? (c.order_id ? `#${c.order_id}` : "–"),
    amount: Number(c.findings?.amount ?? 0),
    deadline: !due ? "–" : hours < 24 ? `${Math.max(hours, 0)} h` : `${Math.round(hours / 24)} days`,
    deadlineHours: hours,
    risk: c.risk_level || "inconclusive",
    evidenceStatus: c.evidence_status,
    status: c.status,
    link: CASE_LINK[type](c),
  };
}

// Findings contract (docs/FRONTEND_BACKEND_GAPS.md §1) -> FindingsPanel props
export function toFindings(f = {}) {
  return {
    risk: f.risk || "inconclusive",
    evidenceStatus: f.evidence_status || "missing",
    rows: (f.items || []).map((i) => ({ kind: i.status || "unverified", text: i.text, detail: i.detail })),
    action: f.suggested_action,
  };
}

const money = (v) => (v == null || v === "" ? null : Number(v));

// GET /cases/{id} -> 09 Order Help case screen
export function toOrderHelpCase(c) {
  const f = c.findings || {};
  const order = f.order_number ?? (c.order_id ? `#${c.order_id}` : "–");
  return {
    id: String(c.id),
    order,
    buyer: f.buyer_name ?? "the buyer",
    buyerEmail: c.order?.buyer_email,
    reason: c.scenario ?? "–",
    message: c.message ?? c.overall_assessment ?? "",
    photos: c.evidence_items?.filter((e) => e.kind === "photo") ?? [],
    history: (c.timeline || []).map((t) => ({ who: t.who || "AI", at: t.date, text: t.text })),
    findings: toFindings(f),
    offers: (c.offers || []).map((o) => ({ id: o.id ?? o.offer, title: o.title ?? o.offer, sub: o.sub ?? "", amount: money(o.amount) ?? 0, recommended: !!o.recommended })),
    total: money(f.amount),
    details: [["Order", order], ...(f.amount ? [["Paid", `$${Number(f.amount).toFixed(2)} via PayPal`]] : [])],
  };
}

// GET /cases/{id} -> 10 Formal dispute screen
export function toDispute(c) {
  const f = c.findings || {};
  const due = c.response_deadline ? Math.max(0, Math.round((new Date(c.response_deadline) - Date.now()) / 864e5)) : null;
  return {
    id: c.paypal_dispute_id ?? String(c.id),
    order: f.order_number ?? (c.order_id ? `#${c.order_id}` : "–"),
    buyer: f.buyer_name ?? "the buyer",
    reason: c.scenario ?? "Dispute",
    why: c.why,
    amount: money(f.amount),
    dueIn: due == null ? "–" : `${due} days`,
    timeline: c.timeline || [],
    evidence: (c.evidence_items || []).map((e) => ({ kind: e.status || "missing", title: e.text ?? e.title, sub: e.detail ?? e.sub ?? "" })),
    evidenceStatus: c.evidence_status,
    draft: c.draft ?? f.suggested_action ?? "",
  };
}

// GET /cases/{id} -> 12 Risk alert screen
export function toRiskCase(c) {
  const f = c.findings || {};
  return {
    id: String(c.id),
    order: f.order_number ?? (c.order_id ? `#${c.order_id}` : "–"),
    buyer: f.buyer_name ?? "–",
    email: c.order?.buyer_email ?? "",
    total: money(f.amount) ?? 0,
    items: c.order?.items ?? "–",
    reasons: c.reasons || (f.items || []).map((i) => i.text),
    actions: (c.actions || []).map((a) => (typeof a === "string" ? { id: a, title: a, sub: "" } : a)),
  };
}

// POST /cases/{id}/approve. Only "refund_sent" means money moved; anything else
// (the current backend returns a stub) is reported as pending, never as sent.
async function approve(caseId, offer) {
  const res = await http(`/cases/${caseId}/approve`, { method: "POST", body: { offer } });
  return { ...res, sent: res?.status === "refund_sent" };
}

/* ---------- API ---------- */
export const api = {
  // Backend: GET /cases, GET /cases/{id}  (currently stubs)
  getCases: USE_MOCK ? fake(mock.cases) : async () => (await http("/cases")).map(toInboxRow),
  getOrderHelpCase: USE_MOCK ? fake(mock.orderHelpCase) : async (id) => toOrderHelpCase(await http(`/cases/${id}`)),
  getDispute: USE_MOCK ? fake(mock.disputeCase) : async (id) => toDispute(await http(`/cases/${id}`)),
  getRiskCase: USE_MOCK ? fake(mock.riskCase) : async (id) => toRiskCase(await http(`/cases/${id}`)),

  // Backend: POST /cases/{id}/approve, POST /cases/{id}/decline  (stubs)
  // Money only moves after the merchant presses Confirm in the UI (docs/RULES.md).
  approveOffer: USE_MOCK ? fake({ status: "refund_sent", sent: true }) : approve,
  declineOffer: USE_MOCK ? fake({ ok: true }) : (caseId) => http(`/cases/${caseId}/decline`, { method: "POST" }),

  // Backend: POST /order-help, GET /order-help/{order_id}  (stubs)
  // Mock: questions the tracking data can answer get an instant answer, the rest go to the seller
  createOrderHelp: USE_MOCK
    ? async (p) => {
        await wait();
        const instant = p.reason === "not_arrived" && ["customs", "late", "stuck", "notracking"].includes(p.not_arrived_reason);
        return instant
          ? { id: "oh_1", type: "answer", kind: p.not_arrived_reason, tracking_steps: mock.buyerOrder.tracking_steps }
          : { id: "oh_1", type: "sent_to_seller", reply_due: "2026-10-30T15:00:00" };
      }
    : (payload) => http("/order-help", { method: "POST", body: payload }),
  getOrderHelp: USE_MOCK ? fake(mock.buyerOrder) : (orderId) => http(`/order-help/${encodeURIComponent(orderId)}`),
  // NOT IN BACKEND YET: POST /order-help/lookup, /order-help/{id}/accept
  lookupOrder: USE_MOCK
    ? async ({ order_number, email }) => {
        await wait();
        const o = mock.buyerOrder;
        const norm = (v) => String(v || "").trim().toLowerCase().replace(/^#/, "");
        if (norm(order_number) !== norm(o.order) || norm(email) !== norm(o.email)) throw new Error("not_found");
        return o;
      }
    : (payload) => http("/order-help/lookup", { method: "POST", body: payload }),
  acceptOffer: USE_MOCK ? fake({ status: "resolved" }) : (id) => http(`/order-help/${encodeURIComponent(id)}/accept`, { method: "POST" }),

  // NOT IN BACKEND YET: personal router has no endpoints
  submitScamCheck: USE_MOCK ? fake({ id: "s3" }) : (payload) => http("/personal/checks", { method: "POST", body: payload }),
  saveScamDecision: USE_MOCK ? fake({ ok: true }) : (id, decision) => http(`/personal/checks/${id}/decision`, { method: "POST", body: { decision } }),
  getScamHistory: USE_MOCK ? fake(mock.scamHistory) : () => http("/personal/checks"),

  // NOT IN BACKEND YET
  getMerchant: USE_MOCK ? fake(mock.merchant) : () => http("/merchant"),
  getStats: USE_MOCK ? fake(mock.stats) : () => http("/merchant/stats"),
  getShipments: USE_MOCK ? fake(mock.shipments) : () => http("/shipments"),
  getInsights: USE_MOCK ? fake(mock.insights) : () => http("/insights"),
  health: () => http("/health"),
};
