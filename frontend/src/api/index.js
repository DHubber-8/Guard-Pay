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

export function toInboxRow(c) {
  const due = c.response_deadline ? new Date(c.response_deadline) : null;
  const hours = due ? Math.round((due - Date.now()) / 36e5) : 999;
  return {
    id: String(c.id),
    type: SCENARIO_TYPE(c),
    title: c.overall_assessment || c.scenario,
    buyer: c.findings?.buyer_name ?? "–",
    order: c.findings?.order_number ?? (c.order_id ? `#${c.order_id}` : "–"),
    amount: Number(c.findings?.amount ?? 0),
    deadline: !due ? "–" : hours < 24 ? `${Math.max(hours, 0)} h` : `${Math.round(hours / 24)} days`,
    deadlineHours: hours,
    risk: c.risk_level || "inconclusive",
    evidenceStatus: c.evidence_status,
    status: c.status,
    link: c.paypal_dispute_id ? `/merchant/disputes/${c.id}` : `/merchant/cases/${c.id}`,
  };
}

/* ---------- API ---------- */
export const api = {
  // Backend: GET /cases, GET /cases/{id}  (currently stubs)
  getCases: USE_MOCK ? fake(mock.cases) : async () => (await http("/cases")).map(toInboxRow),
  getOrderHelpCase: USE_MOCK ? fake(mock.orderHelpCase) : (id) => http(`/cases/${id}`),
  getDispute: USE_MOCK ? fake(mock.disputeCase) : (id) => http(`/cases/${id}`),
  getRiskCase: USE_MOCK ? fake(mock.riskCase) : (id) => http(`/cases/${id}`),

  // Backend: POST /cases/{id}/approve, POST /cases/{id}/decline  (stubs)
  // Money only moves after the merchant presses Confirm in the UI (docs/RULES.md).
  approveOffer: USE_MOCK ? fake({ ok: true }) : (caseId, offer) => http(`/cases/${caseId}/approve`, { method: "POST", body: { offer } }),
  declineOffer: USE_MOCK ? fake({ ok: true }) : (caseId) => http(`/cases/${caseId}/decline`, { method: "POST" }),

  // Backend: POST /order-help, GET /order-help/{order_id}  (stubs)
  createOrderHelp: USE_MOCK ? fake({ id: "oh_1", status: "answered" }) : (payload) => http("/order-help", { method: "POST", body: payload }),
  getOrderHelp: USE_MOCK ? fake(mock.buyerOrder) : (orderId) => http(`/order-help/${encodeURIComponent(orderId)}`),

  // NOT IN BACKEND YET: personal router has no endpoints
  submitScamCheck: USE_MOCK ? fake({ id: "s3" }) : (payload) => http("/personal/checks", { method: "POST", body: payload }),

  // NOT IN BACKEND YET
  getMerchant: USE_MOCK ? fake(mock.merchant) : () => http("/merchant"),
  getStats: USE_MOCK ? fake(mock.stats) : () => http("/merchant/stats"),
  getShipments: USE_MOCK ? fake(mock.shipments) : () => http("/shipments"),
  getInsights: USE_MOCK ? fake(mock.insights) : () => http("/insights"),
  health: () => http("/health"),
};
