// All data access goes through here. Pages call these with useQuery(), e.g.
//   const { data, isLoading } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
//
// Matches the FastAPI backend in /backend (routes have no /api prefix).
// While USE_MOCK is true (default) the demo data in src/mock/console.js is used.
// Set VITE_USE_MOCK=false in frontend/.env to call the real backend.
// Endpoints the backend doesn't have yet are listed in docs/FRONTEND_BACKEND_GAPS.md.
//
// Everything here reads data that PayPal already holds (disputes, payments,
// tracking, account history). Requests for more information go to the buyer
// or merchant through PayPal, never directly.
import { USE_MOCK, API_URL } from "../config";
import * as mock from "../mock/console";

export async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = new Error(`${method} ${path} failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/* ---------- Adapters: backend shape -> what the screens use ---------- */
// backend Case (db/models.py): id, mode, scenario, status, paypal_dispute_id,
// order_id, findings, risk_level, evidence_status, overall_assessment, response_deadline
export function toQueueRow(c) {
  const f = c.findings || {};
  const due = c.response_deadline ? new Date(c.response_deadline) : null;
  return {
    id: c.paypal_dispute_id || String(c.id ?? c.case_id),
    reason: c.scenario || "unclassified",
    stage: f.stage || "Claim",
    merchant: f.merchant_name ?? "–",
    buyer: f.buyer_name ?? "–",
    amount: Number(f.amount ?? 0),
    deadlineHours: due ? Math.round((due - Date.now()) / 36e5) : 999,
    risk: c.risk_level || "inconclusive",
    evidenceStatus: c.evidence_status || "missing",
    status: c.status || "Open",
    assignee: f.assignee ?? null,
    flagged: c.risk_level === "high",
    delivery: f.delivery_watch?.status ?? null,
  };
}

// Action ids drive the case page: info_buyer / info_merchant open the request-info
// flow, and moves_money adds the "this moves money" warning. Plain strings from an
// older backend get an id guessed from their wording.
function toOption(a, i) {
  if (typeof a === "object" && a) {
    return { id: a.id ?? `a${i}`, title: a.title, sub: a.sub, movesMoney: a.moves_money, recommended: a.recommended ?? i === 0 };
  }
  const t = String(a);
  const id = /ask the buyer|buyer for more/i.test(t) ? "info_buyer" : /ask the merchant|merchant for /i.test(t) ? "info_merchant" : `a${i}`;
  return { id, title: t, recommended: i === 0 };
}

// Findings contract (docs/FRONTEND_BACKEND_GAPS.md §1) -> case workspace
export function toCaseDetail(c) {
  const f = c.findings || {};
  const row = toQueueRow(c);
  return {
    ...row,
    summary: f.case_summary ?? "",
    assessment: c.overall_assessment ?? f.overall_assessment ?? "inconclusive",
    transaction: f.transaction ?? {},
    buyer: f.buyer ?? { name: row.buyer },
    merchant: f.merchant ?? { name: row.merchant },
    timeline: c.timeline ?? [],
    evidence: [
      ...(f.evidence_supporting || []).map((e) => ({ side: e.source, kind: e.verified ? "verified" : "unverified", text: e.description, detail: e.source })),
      ...(f.evidence_contradicting || []).map((e) => ({ side: e.source, kind: "contradiction", text: e.description, detail: e.source })),
      ...(f.missing_information || []).map((t) => ({ side: "missing", kind: "missing", text: t, detail: "" })),
    ],
    flags: (f.risk_reasons || []).map((t) => ({ level: row.risk === "high" ? "high" : "medium", text: t })),
    options: (f.recommended_actions || []).map(toOption),
    recommendation: f.recommendation ?? toOption(f.recommended_actions?.[0] ?? "", 0).title ?? "",
    // Written by the A7 delivery watch worker (docs/FRONTEND_BACKEND_GAPS.md §10)
    deliveryWatch: f.delivery_watch ? {
      carrier: f.delivery_watch.carrier, tracking: f.delivery_watch.tracking_number, status: f.delivery_watch.status,
      latest: f.delivery_watch.latest_event, lastChecked: f.delivery_watch.last_checked, mismatch: f.delivery_watch.mismatch,
    } : null,
    audit: c.audit ?? [],
  };
}

/* ---------- Demo backend (mock mode) ---------- */
const store = {
  cases: mock.cases.map((c) => ({ ...c })),
  audit: mock.auditLog.map((a) => ({ ...a })),
};
let auditSeq = 2000;
const nextAuditId = () => `AL-${auditSeq++}`;
const now = () => new Date().toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(",", "");

function mockDetail(id) {
  const row = store.cases.find((c) => c.id === id);
  if (!row) { const e = new Error("not_found"); e.status = 404; throw e; }
  const d = mock.caseDetails[id] || {
    summary: "No AI summary yet for this case.", assessment: "inconclusive", transaction: {}, buyer: { name: row.buyer }, merchant: { name: row.merchant },
    timeline: [], evidence: [], flags: [], options: [{ id: "info_merchant", title: "Ask the merchant for tracking", recommended: true }], recommendation: "Consider asking for more information first.",
  };
  return { ...row, ...d, deliveryWatch: mock.deliveryWatch[id] ?? null, audit: store.audit.filter((a) => a.case === id) };
}

const mockApi = {
  getCases: async () => { await wait(); return store.cases.map((c) => ({ ...c, delivery: mock.deliveryWatch[c.id]?.status ?? null })); },
  getCase: async (id) => { await wait(); return mockDetail(id); },
  requestInfo: async (id, { party, message, approverId }) => {
    await wait(500);
    const c = store.cases.find((x) => x.id === id);
    c.status = party === "buyer" ? "Waiting for buyer" : "Waiting for merchant";
    store.audit.unshift({ id: nextAuditId(), at: now(), case: id, action: `Request info from ${party}`, ai: "–", decision: "Sent via PayPal", by: approverId ?? "staff-diana", notes: message.slice(0, 80) });
    return { status: "sent", via: "paypal" };
  },
  decide: async (id, { action, aiRecommendation, decision, notes, approverId }) => {
    await wait(600);
    if (!approverId) throw new Error("approver_required");
    const c = store.cases.find((x) => x.id === id);
    c.status = "Resolved";
    store.audit.unshift({ id: nextAuditId(), at: now(), case: id, action, ai: aiRecommendation, decision, by: approverId, notes });
    return { status: "recorded" };
  },
  assign: async (id, staffId) => { await wait(200); store.cases.find((x) => x.id === id).assignee = staffId; return { ok: true }; },
  getFlags: async () => { await wait(); return mock.flags; },
  checkAccount: async (q) => {
    await wait(500);
    const key = Object.keys(mock.checks).find((k) => k.toLowerCase() === String(q).trim().toLowerCase());
    if (!key) { const e = new Error("not_found"); e.status = 404; throw e; }
    return mock.checks[key];
  },
  getInsights: async () => { await wait(); return mock.insights; },
  getAuditLog: async () => { await wait(); return store.audit; },
  getWatchStatus: async () => { await wait(); return mock.watchStatus; },
};

/* ---------- Real backend ---------- */
const realApi = {
  // Backend: GET /cases, GET /cases/{id}  (stubs today)
  getCases: async () => (await http("/cases")).map(toQueueRow),
  getCase: async (id) => toCaseDetail(await http(`/cases/${encodeURIComponent(id)}`)),
  // NOT IN BACKEND YET: PayPal sends the request to the buyer or merchant
  // (paypal/disputes.py send_message needs approver_id).
  // Only report success when the backend says it sent the request (today's stubs don't).
  requestInfo: async (id, { party, message, approverId }) => {
    const res = await http(`/cases/${encodeURIComponent(id)}/request-info`, {
      method: "POST",
      body: { party, message, approver_id: approverId },
    });
    if (res?.status !== "sent") throw new Error("request_not_sent");
    return res;
  },
  // Backend: POST /cases/{id}/approve (stub). Writes Approval + AuditLog rows.
  // The current stub answers 200 with {"status": "stub"}, so only "recorded" counts as saved.
  decide: async (id, body) => {
    const res = await http(`/cases/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: { action_type: body.action, action_id: body.actionId, approver_id: body.approverId, decision: body.decision, ai_recommendation: body.aiRecommendation, notes: body.notes },
    });
    if (res?.status !== "recorded") throw new Error("decision_not_saved");
    return res;
  },
  // NOT IN BACKEND YET
  assign: (id, staffId) => http(`/cases/${encodeURIComponent(id)}/assign`, { method: "POST", body: { staff_id: staffId } }),
  getFlags: () => http("/flags"),
  checkAccount: (q) => http(`/checks?q=${encodeURIComponent(q)}`),
  getInsights: () => http("/insights"),
  getAuditLog: () => http("/audit-log"),
  // NOT IN BACKEND YET: when the A7 workers last ran
  getWatchStatus: () => http("/workers/status"),
};

export const api = { ...(USE_MOCK ? mockApi : realApi), health: () => http("/health") };
