// All data access goes through here. Pages call these with useQuery(), e.g.
//   const { data, isLoading } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
//
// Matches the FastAPI backend in /backend (routes have no /api prefix).
// In mock mode, queue data is synthetic; analysis runs on the real Python backend.
// Set VITE_USE_MOCK=true in frontend/.env for synthetic disputes + live analysis.
// Endpoints the backend doesn't have yet are listed in docs/FRONTEND_BACKEND_GAPS.md.
//
// Everything here reads data that PayPal already holds (disputes, payments,
// tracking, account history). Requests for more information go to the buyer
// or merchant through PayPal, never directly.

import { USE_MOCK, API_URL } from "../config";
import * as mock from "../mock/console";
import { toAnalysisView } from "./analysisAdapter";

export async function http(path, { method = "GET", body } = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
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
        return {
            id: a.id ?? `a${i}`,
            title: a.title,
            sub: a.sub,
            movesMoney: a.moves_money,
            recommended: a.recommended ?? i === 0,
        };
    }

    const t = String(a);

    const id = /ask the buyer|buyer for more/i.test(t)
        ? "info_buyer"
        : /ask the merchant|merchant for /i.test(t)
            ? "info_merchant"
            : `a${i}`;

    return { id, title: t, recommended: i === 0 };
}

// Findings contract (docs/FRONTEND_BACKEND_GAPS.md §1) -> case workspace

export function toCaseDetail(c) {
    const f = c.findings || {};
    const row = toQueueRow(c);

    return {
        ...row,
        summary: f.case_summary ?? "",
        assessment:
            c.overall_assessment ??
            f.overall_assessment ??
            "inconclusive",

        transaction: f.transaction ?? {},
        buyer: f.buyer ?? { name: row.buyer },
        merchant: f.merchant ?? { name: row.merchant },
        timeline: c.timeline ?? [],

        evidence: [
            ...(f.evidence_supporting || []).map((e) => ({
                side: e.source,
                kind: e.verified ? "verified" : "unverified",
                text: e.description,
                detail: e.source,
            })),

            ...(f.evidence_contradicting || []).map((e) => ({
                side: e.source,
                kind: "contradiction",
                text: e.description,
                detail: e.source,
            })),

            ...(f.missing_information || []).map((t) => ({
                side: "missing",
                kind: "missing",
                text: t,
                detail: "",
            })),
        ],

        flags: (f.risk_reasons || []).map((t) => ({
            level: row.risk === "high" ? "high" : "medium",
            text: t,
        })),

        options: (f.recommended_actions || []).map(toOption),

        recommendation:
            f.recommendation ??
            toOption(f.recommended_actions?.[0] ?? "", 0).title ??
            "",

        deliveryWatch: f.delivery_watch
            ? {
                carrier: f.delivery_watch.carrier,
                tracking: f.delivery_watch.tracking_number,
                status: f.delivery_watch.status,
                latest: f.delivery_watch.latest_event,
                lastChecked: f.delivery_watch.last_checked,
                mismatch: f.delivery_watch.mismatch,
            }
            : null,

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

const now = () =>
    new Date()
        .toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        })
        .replace(",", "");

function mockDetail(id) {
    const row = store.cases.find((c) => c.id === id);

    if (!row) {
        const e = new Error("not_found");
        e.status = 404;
        throw e;
    }

    const d = mock.caseDetails[id] || {
        summary: "No AI summary yet for this case.",
        assessment: "inconclusive",
        transaction: {},
        buyer: { name: row.buyer },
        merchant: { name: row.merchant },
        timeline: [],
        evidence: [],
        flags: [],
        options: [
            {
                id: "info_merchant",
                title: "Ask the merchant for tracking",
                recommended: true,
            },
        ],
        recommendation: "Consider asking for more information first.",
    };

    return {
        ...row,
        ...d,
        deliveryWatch: mock.deliveryWatch[id] ?? null,
        audit: store.audit.filter((a) => a.case === id),
    };
}

/* ---------- Scenario mapping ---------- */

// Match frontend dispute reasons with backend Python scenario IDs.

const SCENARIO_MAP = {
    item_not_received: "item_not_received",
    not_as_described: "item_not_as_described",
    unauthorized: "unauthorized_purchase",
    unrecognized_charge: "unrecognised_charge_or_subscription",
    scam_report: "payment_request_scam",
};

/* ---------- Build case-specific evidence ---------- */

// Only pass fields present in the synthetic case.
// The backend assesses completeness.
// UI labels such as "verified" are NOT proof of authenticity.

function buildDemoEvidence(dispute, details) {
    const evidence = {};
    const transaction = details.transaction || {};

    if (Object.keys(transaction).length) {
        evidence.transaction_details = transaction;
    }

    evidence.order_details = {
        dispute_id: dispute.id,
        amount: dispute.amount,
        buyer: dispute.buyer,
        merchant: dispute.merchant,
    };

    if (details.summary) {
        evidence.buyer_complaint = details.summary;
    }

    if (transaction.tracking) {
        evidence.shipment_status = transaction.tracking;
    }

    const documents = Array.isArray(details.evidence)
        ? details.evidence
        : [];

    if (documents.length) {
        evidence.supporting_documents = documents.map((item) => ({
            source: item.side,
            description: item.text,
            detail: item.detail,
            claimed_status: item.kind,
        }));
    }

    // Only interpret records labelled verified in the synthetic dataset.
    const verifiedText = documents
        .filter((item) => item.kind === "verified")
        .map((item) => `${item.text} ${item.detail || ""}`)
        .join(" ")
        .toLowerCase();

    const contradictionText = documents
        .filter((item) => item.kind === "contradiction")
        .map((item) => `${item.text} ${item.detail || ""}`)
        .join(" ")
        .toLowerCase();

    const complaint = String(details.summary || "").toLowerCase();

    // 1. Item Not Received
    if (dispute.reason === "item_not_received") {
        if (
            /delivered/.test(verifiedText) &&
            /carrier|ups|usps|fedex|delivery watch/.test(verifiedText)
        ) {
            evidence.delivery_status = "delivered";
            evidence.delivery_verified = true;
        }

        if (
            /never arrived|not received|didn't receive|did not receive/.test(
                complaint
            )
        ) {
            evidence.buyer_claim = "not_received";
        }

        // A mismatch must be supported by a documented comparison.
        if (
            /different address|address mismatch|wrong address/.test(
                contradictionText
            )
        ) {
            evidence.address_mismatch_verified = true;
        }
    }

    // 2. Unauthorized Purchase
    if (dispute.reason === "unauthorized") {
        if (/new device/.test(verifiedText)) {
            evidence.new_device = true;
        }

        if (
            /address never used|ship-to address never used|new address/.test(
                verifiedText
            )
        ) {
            evidence.new_shipping_address = true;
        }

        if (/password reset/.test(verifiedText)) {
            evidence.recent_password_reset = true;
        }
    }

    // 3. Item Not as Described
    if (dispute.reason === "not_as_described") {
        // A documented mismatch between the listing and received item.
        if (
            /listing|description|different brand/.test(contradictionText) &&
            /product|item|brand|listing|description/.test(contradictionText)
        ) {
            evidence.description_contradiction_verified = true;
        }

        if (
            /returned item|return item/.test(contradictionText) &&
            /mismatch|different|incorrect/.test(contradictionText)
        ) {
            evidence.return_item_mismatch_verified = true;
        }

        // Do not infer misleading listings from buyer complaints alone.
    }

    // 4. Payment Request Scam
    if (dispute.reason === "scam_report") {
        // A prize message alone does not prove urgency,
        // impersonation, or credential harvesting.
        // Keep those indicators unset unless supporting
        // records explicitly establish the relevant behaviour.

        const verifiedPressure =
            /urgent payment|pay immediately|pay today|deadline to pay/.test(
                verifiedText
            );

        const verifiedImpersonation =
            /impersonat|pretending to be|fake representative/.test(
                verifiedText
            );

        const verifiedCredentialRequest =
            /asked for password|requested password|requested login code/.test(
                verifiedText
            );

        if (verifiedPressure) {
            evidence.urgent_payment_pressure = true;
        }

        if (verifiedImpersonation) {
            evidence.impersonation_claim = true;
        }

        if (verifiedCredentialRequest) {
            evidence.credential_request = true;
        }
    }

    // 5. Unrecognised Charge / Subscription
    if (dispute.reason === "unrecognized_charge") {
        // Do not flag a subscription that records show
        // the buyer previously agreed to.

        if (
            /unknown subscription|no subscription agreement/.test(
                verifiedText
            )
        ) {
            evidence.unknown_subscription_verified = true;
        }

        if (
            /charged after cancellation|charge after cancellation/.test(
                verifiedText
            )
        ) {
            evidence.charge_after_cancellation_verified = true;
        }

        if (
            /billing amount mismatch|charged amount differs/.test(
                verifiedText
            )
        ) {
            evidence.billing_amount_mismatch_verified = true;
        }
    }

    return evidence;
}
// Synthetic indicators for testing the Python risk engine
const DEMO_INDICATORS = {
    "PP-D-41027": [
        "ITEM_NOT_RECEIVED_01",
    ],

    "PP-D-41033": [
        "UNAUTHORIZED_PURCHASE_01",
        "UNAUTHORIZED_PURCHASE_02",
        "UNAUTHORIZED_PURCHASE_03",
    ],
};
/* ---------- Mock API with REAL Python analysis ---------- */

const mockApi = {
    // Synthetic dispute data + real FastAPI/Python analysis.

    analyzeCase: async (id) => {
        const dispute = store.cases.find((c) => c.id === id);

        if (!dispute) {
            throw new Error(`Dispute ${id} not found`);
        }

        const scenario_id = SCENARIO_MAP[dispute.reason];

        if (!scenario_id) {
            throw new Error(
                `Unsupported dispute reason: ${dispute.reason}`
            );
        }

        const details = mockDetail(id);

        const result = await http("/demo/analyze", {
            method: "POST",
            body: {
                case_id: dispute.id,
                scenario_id,
                evidence: buildDemoEvidence(dispute, details),
                triggered_indicators: DEMO_INDICATORS[dispute.id] ?? [],
            },
        });

        return toAnalysisView(result);
    },

    getCases: async () => {
        await wait();

        return store.cases.map((c) => ({
            ...c,
            delivery: mock.deliveryWatch[c.id]?.status ?? null,
        }));
    },

    getCase: async (id) => {
        await wait();
        return mockDetail(id);
    },

    requestInfo: async (id, { party, message, approverId }) => {
        await wait(500);

        const c = store.cases.find((x) => x.id === id);

        c.status =
            party === "buyer"
                ? "Waiting for buyer"
                : "Waiting for merchant";

        store.audit.unshift({
            id: nextAuditId(),
            at: now(),
            case: id,
            action: `Request info from ${party}`,
            ai: "–",
            decision: "Sent via PayPal",
            by: approverId ?? "staff-diana",
            notes: message.slice(0, 80),
        });

        return { status: "sent", via: "paypal" };
    },

    decide: async (
        id,
        {
            action,
            aiRecommendation,
            decision,
            notes,
            approverId,
        }
    ) => {
        await wait(600);

        if (!approverId) {
            throw new Error("approver_required");
        }

        const c = store.cases.find((x) => x.id === id);

        c.status = "Resolved";

        store.audit.unshift({
            id: nextAuditId(),
            at: now(),
            case: id,
            action,
            ai: aiRecommendation,
            decision,
            by: approverId,
            notes,
        });

        return { status: "recorded" };
    },

    assign: async (id, staffId) => {
        await wait(200);

        store.cases.find((x) => x.id === id).assignee = staffId;

        return { ok: true };
    },

    getFlags: async () => {
        await wait();
        return mock.flags;
    },

    checkAccount: async (q) => {
        await wait(500);

        const key = Object.keys(mock.checks).find(
            (k) =>
                k.toLowerCase() ===
                String(q).trim().toLowerCase()
        );

        if (!key) {
            const e = new Error("not_found");
            e.status = 404;
            throw e;
        }

        return mock.checks[key];
    },

    getInsights: async () => {
        await wait();
        return mock.insights;
    },

    getAuditLog: async () => {
        await wait();
        return store.audit;
    },

    getWatchStatus: async () => {
        await wait();
        return mock.watchStatus;
    },
};

/* ---------- Real backend ---------- */

const realApi = {
    analyzeCase: async (id) => {
        const result = await http(
            `/cases/${encodeURIComponent(id)}/analyze`,
            { method: "POST" }
        );

        return toAnalysisView(result);
    },

    // Backend: GET /cases, GET /cases/{id}

    getCases: async () =>
        (await http("/cases")).map(toQueueRow),

    getCase: async (id) =>
        toCaseDetail(
            await http(`/cases/${encodeURIComponent(id)}`)
        ),

    // Request information through backend.

    requestInfo: async (
        id,
        { party, message, approverId }
    ) => {
        const res = await http(
            `/cases/${encodeURIComponent(id)}/request-info`,
            {
                method: "POST",
                body: {
                    party,
                    message,
                    approver_id: approverId,
                },
            }
        );

        if (res?.status !== "sent") {
            throw new Error("request_not_sent");
        }

        return res;
    },

    // Human approval required.

    decide: async (id, body) => {
        const res = await http(
            `/cases/${encodeURIComponent(id)}/approve`,
            {
                method: "POST",
                body: {
                    action_type: body.action,
                    action_id: body.actionId,
                    approver_id: body.approverId,
                    decision: body.decision,
                    ai_recommendation: body.aiRecommendation,
                    notes: body.notes,
                },
            }
        );

        if (res?.status !== "recorded") {
            throw new Error("decision_not_saved");
        }

        return res;
    },

    assign: (id, staffId) =>
        http(`/cases/${encodeURIComponent(id)}/assign`, {
            method: "POST",
            body: { staff_id: staffId },
        }),

    getFlags: () => http("/flags"),

    checkAccount: (q) =>
        http(`/checks?q=${encodeURIComponent(q)}`),

    getInsights: () => http("/insights"),

    getAuditLog: () => http("/audit-log"),

    getWatchStatus: () => http("/workers/status"),
};

/* ---------- API selection ---------- */

export const api = {
    ...(USE_MOCK ? mockApi : realApi),
    health: () => http("/health"),
};