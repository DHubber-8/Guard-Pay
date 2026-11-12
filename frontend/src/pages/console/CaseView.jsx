// Case workspace: synthetic PayPal dispute records with live Python analysis.
// Fraud analysis is advisory. Human approval is required for decisions.
// Demo actions are simulated when VITE_USE_MOCK=true.

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import {
    ChevronRight,
    Sparkles,
    TriangleAlert,
    Flag,
    Send,
    Gavel,
    UserCheck,
    ScrollText,
    Search,
    Radar,
    Truck,
    Clock,
} from "lucide-react";

import { api } from "../../api";

import {
    Button,
    Card,
    Badge,
    RiskBadge,
    KV,
    Modal,
    RadioCard,
    Notice,
    Skeleton,
    Textarea,
    Chips,
    useToast,
} from "../../components/ui";

import { EvidenceBadge } from "../../components/FindingsPanel";

import {
    REASON_LABEL,
    ASSESSMENT,
    STAFF,
    DELIVERY,
    money,
    due,
} from "../../labels";

import { useStaff } from "../../session";

import { USE_MOCK } from "../../config";

/* ---------- Constants ---------- */

const KIND = {
    verified: ["low", "Verified"],
    unverified: ["medium", "Unverified"],
    missing: ["neutral", "Missing"],
    contradiction: ["high", "Contradicts"],
};

const SIDE = {
    buyer: "Buyer",
    merchant: "Merchant",
    paypal: "PayPal",
    missing: "Missing",
};

const isInfo = (o) => o?.id?.startsWith("info_");

const movesMoney = (o) =>
    o?.movesMoney ??
    (
        /refund|buyer_full|partial/i.test(o?.id || "") ||
        /refund/i.test(o?.title || "")
    );

/* ---------- Helpers ---------- */

function Party({ title, p, rows }) {
    return (
        <Card className="tight party">
            <span className="caption muted">
                {title}
            </span>

            <div className="stack">
                <span className="body-strong">
                    {p.name}
                </span>

                {p.email && (
                    <span className="small muted">
                        {p.email}
                    </span>
                )}
            </div>

            <KV
                rows={rows.filter(
                    ([, v]) => v != null && v !== ""
                )}
            />

            {p.email && (
                <Link
                    to={`/checks?q=${encodeURIComponent(p.email)}`}
                    className="link small row gap-4"
                >
                    <Search size={14} />
                    Check this account
                </Link>
            )}
        </Card>
    );
}

/* ---------- Automatic Checks ---------- */

function AutoChecks({ c, resolved }) {
    const d = c.deliveryWatch;

    const reminder = c.audit?.find(
        (a) => a.by === "deadline-watch"
    );

    const overdue =
        !resolved && c.deadlineHours < 0;

    const [dTone, dLabel] = resolved
        ? ["neutral", "Closed"]
        : overdue
            ? ["high", "Overdue"]
            : c.deadlineHours < 24
                ? ["high", "Due soon"]
                : ["low", "On track"];

    const [sTone, sLabel] = d
        ? DELIVERY[d.status] ?? ["neutral", d.status]
        : ["neutral", "No shipment"];

    return (
        <Card>
            <div className="row gap-8">
                <Radar
                    size={18}
                    color="var(--blue-600)"
                />

                <h2 className="h3">
                    Automatic checks
                </h2>
            </div>

            <div className="watch-row">
                <Clock size={18} />

                <div className="grow stack gap-4">
                    <span className="body-strong">
                        Deadline watch
                    </span>

                    <span className="small text-2">
                        {resolved
                            ? "Case is closed. No more reminders."
                            : overdue
                                ? "The PayPal response deadline has passed."
                                : `PayPal response due in ${due(c.deadlineHours)}.`}

                        {!resolved &&
                            (reminder
                                ? ` ${reminder.notes || "Reminder sent"}.`
                                : c.assignee
                                    ? ""
                                    : " Nobody is assigned yet.")}
                    </span>
                </div>

                <Badge level={dTone}>
                    {dLabel}
                </Badge>
            </div>

            <div className="watch-row">
                <Truck size={18} />

                <div className="grow stack gap-4">
                    <span className="body-strong">
                        Delivery watch
                    </span>

                    {d ? (
                        <>
                            <span className="small text-2">
                                {d.carrier !== "–"
                                    ? `${d.carrier} ${d.tracking} · `
                                    : ""}

                                {d.latest}
                            </span>

                            <span className="small muted">
                                Checked {d.lastChecked}
                            </span>
                        </>
                    ) : (
                        <span className="small text-2">
                            No shipment to watch for this payment.
                        </span>
                    )}
                </div>

                <Badge level={sTone}>
                    {sLabel}
                </Badge>
            </div>

            {d?.mismatch && (
                <Notice
                    icon={TriangleAlert}
                    tone="warm"
                >
                    {d.mismatch}
                </Notice>
            )}

            <p className="small muted">
                {USE_MOCK
                    ? "Demo watch information is synthetic. No live carrier or PayPal monitoring is performed here."
                    : "These checks raise flags and reminders. They do not decide cases or move money."}
            </p>
        </Card>
    );
}

/* ---------- Main Case View ---------- */

export default function CaseView() {
    const { id } = useParams();

    const staff = useStaff();
    const qc = useQueryClient();

    const [toast, showToast] = useToast();

    const [choice, setChoice] = useState(null);
    const [side, setSide] = useState("all");

    const [modal, setModal] = useState(null);

    const [notes, setNotes] = useState("");
    const [party, setParty] = useState("merchant");
    const [message, setMessage] = useState("");

    /* ---------- Load Dispute ---------- */

    const {
        data: c,
        isError,
    } = useQuery({
        queryKey: ["case", id],
        queryFn: () => api.getCase(id),
        retry: false,
    });

    /* ---------- REAL Python Analysis ---------- */

    // Supports both numeric backend IDs and mock IDs such as PP-D-41027.
    // In mock mode, api.analyzeCase calls POST /demo/analyze.

    const {
        data: analysis,
        isLoading: analysisLoading,
        isError: analysisError,
        error: analysisFailure,
        isFetching: analysisFetching,
    } = useQuery({
        queryKey: ["case-analysis", id],

        queryFn: () => api.analyzeCase(id),

        enabled:
            Boolean(c) &&
            !isError &&
            typeof api.analyzeCase === "function",

        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: false,
    });

    /* ---------- Refresh ---------- */

    const refresh = () => {
        qc.invalidateQueries({
            queryKey: ["case", id],
        });

        qc.invalidateQueries({
            queryKey: ["case-analysis", id],
        });

        qc.invalidateQueries({
            queryKey: ["cases"],
        });

        qc.invalidateQueries({
            queryKey: ["audit"],
        });
    };

    const refreshAnalysis = () => {
        qc.invalidateQueries({
            queryKey: ["case-analysis", id],
        });
    };

    /* ---------- Recommendations ---------- */

    const recommended =
        c?.options?.find((o) => o.recommended) ??
        c?.options?.[0];

    const chosen =
        c?.options?.find((o) => o.id === choice) ??
        recommended;

    /* ---------- Record Decision ---------- */

    const decide = useMutation({
        mutationFn: () =>
            api.decide(id, {
                action: chosen.title,
                actionId: chosen.id,

                aiRecommendation:
                    recommended?.title ?? "–",

                decision:
                    chosen.id === recommended?.id
                        ? "Approved suggested action"
                        : "Chose a different action",

                notes,
                approverId: staff.id,
            }),

        onSuccess: () => {
            setModal(null);
            setNotes("");
            refresh();

            showToast(
                USE_MOCK
                    ? "Demo decision recorded locally"
                    : "Decision recorded"
            );
        },

        onError: () =>
            showToast(
                "Couldn't record the decision · nothing was changed"
            ),
    });

    /* ---------- Request Information ---------- */

    const ask = useMutation({
        mutationFn: () =>
            api.requestInfo(id, {
                party,
                message,
                approverId: staff.id,
            }),

        onSuccess: () => {
            setModal(null);
            refresh();

            showToast(
                USE_MOCK
                    ? `Demo request recorded for ${party}`
                    : `Request sent · waiting for the ${party}`
            );
        },

        onError: () =>
            showToast(
                "Couldn't send the request · try again"
            ),
    });

    /* ---------- Assign Case ---------- */

    const assign = useMutation({
        mutationFn: () =>
            api.assign(id, staff.id),

        onSuccess: () => {
            refresh();
            showToast("Assigned to you");
        },

        onError: () =>
            showToast(
                "Couldn't assign the case · try again"
            ),
    });

    /* ---------- Error / Loading ---------- */

    if (isError) {
        return (
            <Card
                style={{
                    alignItems: "center",
                    textAlign: "center",
                    padding: 48,
                }}
            >
                <h1 className="h2">
                    Case {id} not found
                </h1>

                <p className="text-2">
                    Check the case ID, or open the queue.
                </p>

                <Button
                    to="/queue"
                    kind="secondary"
                >
                    Open the queue
                </Button>
            </Card>
        );
    }

    if (!c) {
        return (
            <>
                <Skeleton h={32} w={360} />
                <Skeleton h={200} />
                <Skeleton h={260} />
            </>
        );
    }

    /* ---------- Case Data ---------- */

    const resolved = c.status === "Resolved";

    const [aTone, aLabel] =
        ASSESSMENT[c.assessment] ||
        ASSESSMENT.inconclusive;

    const evidence =
        side === "all"
            ? c.evidence
            : c.evidence.filter(
                (e) => e.side === side
            );

    const sides = [
        ...new Set(
            c.evidence.map((e) => e.side)
        ),
    ];

    const t = c.transaction || {};

    /* ---------- Live Analysis Display ---------- */

    const liveRisk =
        analysis?.risk ?? c.risk;

    const liveEvidenceStatus =
        analysis?.evidenceStatus ??
        analysis?.evidence_status ??
        c.evidenceStatus;

    const liveSummary =
        analysis?.summary ??
        analysis?.explanation ??
        null;

    const liveFindings =
        analysis?.findings ?? null;

    const liveDraft =
        analysis?.draftResponse ??
        analysis?.draft_response ??
        null;

    const liveScore =
        analysis?.riskScore ??
        analysis?.risk_score ??
        null;

    const liveRecommendation =
        analysis?.recommendation ??
        liveFindings?.suggested_action ??
        null;

    const liveNeedsReview =
        analysis?.needsReview ??
        analysis?.needs_review ??
        null;

    /* ---------- Request Info Message ---------- */

    const openInfo = (who) => {
        setParty(who);

        setMessage(
            who === "buyer"
                ? `Hello ${c.buyer.name?.split(" ")[0] ?? ""}, to help us review case ${c.id}, please share any extra details or documents (for example a police report or photos). You can reply in the Resolution Center.`
                : `Hello ${c.merchant.name}, to help us review case ${c.id}, please upload proof for this order (for example tracking, the original listing or an invoice that matches the order). You can reply in the Resolution Center.`
        );

        setModal("info");
    };

    const act = () =>
        isInfo(chosen)
            ? openInfo(
                chosen.id === "info_buyer"
                    ? "buyer"
                    : "merchant"
            )
            : setModal("decide");

    /* ---------- Render ---------- */

    return (
        <>
            {/* ---------- Header ---------- */}

            <div className="case-head">
                <div className="crumb">
                    <Link to="/queue">
                        Dispute queue
                    </Link>

                    <ChevronRight size={14} />

                    <span>{c.id}</span>
                </div>

                <div className="row gap-12 wrap">
                    <h1 className="h1">
                        {REASON_LABEL[c.reason] ?? c.reason}
                        {" · "}
                        {money(c.amount)}
                    </h1>

                    {c.flagged && (
                        <Badge level="high">
                            <Flag size={12} />
                            Flagged
                        </Badge>
                    )}

                    {USE_MOCK && (
                        <Badge level="info">
                            Synthetic dispute
                        </Badge>
                    )}
                </div>

                <div className="case-meta">
                    <span>
                        Stage <b>{c.stage}</b>
                    </span>

                    <span>
                        Status <b>{c.status}</b>
                    </span>

                    <span>
                        PayPal deadline{" "}
                        <b
                            className={
                                c.deadlineHours < 24
                                    ? "deadline soon"
                                    : ""
                            }
                        >
                            {due(c.deadlineHours)}
                        </b>
                    </span>

                    <span>
                        Assigned{" "}
                        <b>
                            {STAFF[c.assignee] ?? "Nobody"}
                        </b>
                    </span>

                    {c.assignee !== staff.id &&
                        !resolved && (
                            <button
                                className="btn ghost sm"
                                onClick={() =>
                                    assign.mutate()
                                }
                            >
                                <UserCheck size={16} />
                                Assign to me
                            </button>
                        )}
                </div>
            </div>

            {/* ---------- Main Columns ---------- */}

            <div className="cols wide-side">
                <div className="stack gap-24">

                    {/* ---------- Live Python Analysis ---------- */}

                    <Card className="ai-box">
                        <div className="row between wrap gap-8">
                            <div className="row gap-8">
                                <Sparkles
                                    size={18}
                                    color="var(--blue-600)"
                                />

                                <h2 className="h3">
                                    Python Fraud Analysis
                                </h2>
                            </div>

                            <div className="row gap-8 wrap">
                                <RiskBadge
                                    level={liveRisk}
                                />

                                <EvidenceBadge
                                    status={liveEvidenceStatus}
                                />

                                {analysis && (
                                    <Badge level="info">
                                        Live Python Analysis
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Analysis Status */}

                        {analysisLoading && !analysis && (
                            <p>
                                Analyzing dispute using
                                the Python backend...
                            </p>
                        )}

                        {analysisError && (
                            <Notice
                                icon={TriangleAlert}
                                tone="warm"
                            >
                                Python analysis unavailable.
                                The existing case information
                                is synthetic.

                                {analysisFailure?.message && (
                                    <span>
                                        {" "}
                                        {analysisFailure.message}
                                    </span>
                                )}
                            </Notice>
                        )}

                        {/* Real Summary */}

                        {analysis && (
                            <>
                                <p style={{ fontSize: 16 }}>
                                    {liveSummary ||
                                        "Python analysis completed."}
                                </p>

                                <div className="row gap-8 wrap">
                                    {liveScore != null && (
                                        <Badge level="info">
                                            Warning score: {liveScore}
                                        </Badge>
                                    )}

                                    {liveNeedsReview === true && (
                                        <Badge level="medium">
                                            Human review required
                                        </Badge>
                                    )}
                                </div>

                                {liveRecommendation && (
                                    <div
                                        className="notice"
                                        style={{
                                            marginTop: 12,
                                        }}
                                    >
                                        <Sparkles
                                            size={18}
                                            color="var(--blue-600)"
                                        />

                                        <span>
                                            <b>
                                                Python recommendation:
                                            </b>{" "}
                                            {liveRecommendation}
                                        </span>
                                    </div>
                                )}

                                {Array.isArray(liveFindings?.items) &&
                                    liveFindings.items.length > 0 && (
                                        <div
                                            className="stack gap-8"
                                            style={{
                                                marginTop: 16,
                                            }}
                                        >
                                            <h3 className="body-strong">
                                                Analysis findings
                                            </h3>

                                            {liveFindings.items.map(
                                                (item, i) => (
                                                    <p
                                                        key={i}
                                                        className="small text-2"
                                                    >
                                                        {typeof item === "string"
                                                            ? item
                                                            : item?.description ??
                                                            item?.text ??
                                                            JSON.stringify(item)}
                                                    </p>
                                                )
                                            )}
                                        </div>
                                    )}

                                {liveDraft && (
                                    <div
                                        className="stack gap-8"
                                        style={{
                                            marginTop: 16,
                                        }}
                                    >
                                        <h3 className="body-strong">
                                            Python-generated draft response
                                        </h3>

                                        <p
                                            className="small text-2"
                                            style={{
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {liveDraft}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {!analysis &&
                            !analysisLoading && (
                                <p>
                                    {c.summary}
                                </p>
                            )}

                        <div
                            className="row gap-8 wrap"
                            style={{
                                marginTop: 12,
                            }}
                        >
                            <Button
                                kind="secondary"
                                size="sm"
                                onClick={refreshAnalysis}
                                disabled={analysisFetching}
                            >
                                {analysisFetching
                                    ? "Analyzing..."
                                    : "Run analysis again"}
                            </Button>
                        </div>

                        <p className="small muted">
                            Live rule-based Python analysis
                            using available case data.
                            Synthetic records are not
                            independently verified.
                            Results are not proof of fraud.
                            Human approval is required.
                        </p>
                    </Card>

                    {/* ---------- Evidence ---------- */}

                    <Card>
                        <div className="row between wrap gap-8">
                            <h2 className="h3">
                                Evidence
                            </h2>

                            <span className="small muted">
                                {
                                    c.evidence.filter(
                                        (e) =>
                                            e.kind === "verified"
                                    ).length
                                }{" "}
                                of {c.evidence.length} marked verified
                            </span>
                        </div>

                        {sides.length > 1 && (
                            <div
                                className="tabs"
                                role="tablist"
                            >
                                {["all", ...sides].map(
                                    (s) => (
                                        <button
                                            key={s}
                                            role="tab"
                                            aria-selected={
                                                side === s
                                            }
                                            className={`tab ${side === s
                                                    ? "on"
                                                    : ""
                                                }`}
                                            onClick={() =>
                                                setSide(s)
                                            }
                                        >
                                            {s === "all"
                                                ? "All"
                                                : SIDE[s] ?? s}
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        <div>
                            {evidence.map((e, i) => (
                                <div
                                    key={`${e.side}-${i}`}
                                    className="ev-row"
                                >
                                    <Badge
                                        level={
                                            KIND[e.kind]?.[0] ??
                                            "neutral"
                                        }
                                    >
                                        {KIND[e.kind]?.[1] ??
                                            e.kind}
                                    </Badge>

                                    <div className="grow stack gap-4">
                                        <span>
                                            {e.text}
                                        </span>

                                        <span className="small muted">
                                            {e.detail}
                                        </span>
                                    </div>

                                    <span className="side-tag">
                                        {SIDE[e.side] ??
                                            e.side}
                                    </span>
                                </div>
                            ))}

                            {!evidence.length && (
                                <p className="small muted">
                                    No evidence yet.
                                </p>
                            )}
                        </div>

                        {USE_MOCK && (
                            <p className="small muted">
                                Evidence labels are part of
                                the synthetic demo dataset.
                            </p>
                        )}
                    </Card>

                    {/* ---------- Timeline ---------- */}

                    <Card>
                        <h2 className="h3">
                            {USE_MOCK
                                ? "Demo dispute timeline"
                                : "Timeline from PayPal"}
                        </h2>

                        <ul className="timeline">
                            {c.timeline.map((x) => (
                                <li
                                    key={x.date + x.text}
                                >
                                    <span className="small muted">
                                        {x.date}
                                    </span>

                                    <span
                                        className={`dot ${x.alert
                                                ? "alert"
                                                : ""
                                            }`}
                                    />

                                    <span>
                                        {x.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {/* ---------- Buyer / Merchant ---------- */}

                    <div className="grid-2">
                        <Party
                            title="Buyer"
                            p={c.buyer}
                            rows={[
                                [
                                    "Customer since",
                                    c.buyer.since,
                                ],
                                [
                                    "Disputes (90 d)",
                                    c.buyer.disputes90d,
                                ],
                                [
                                    "Country",
                                    c.buyer.country,
                                ],
                            ]}
                        />

                        <Party
                            title="Merchant"
                            p={c.merchant}
                            rows={[
                                [
                                    "Customer since",
                                    c.merchant.since,
                                ],
                                [
                                    "Dispute rate",
                                    c.merchant.disputeRate,
                                ],
                                [
                                    "Seller protection",
                                    c.merchant.sellerProtection,
                                ],
                            ]}
                        />
                    </div>

                    {/* ---------- Transaction ---------- */}

                    <Card className="tight">
                        <span className="caption muted">
                            Transaction
                        </span>

                        <KV
                            rows={[
                                ["ID", t.id],
                                ["Date", t.date],
                                ["Items", t.items],
                                ["Ship to", t.shipTo],
                                ["Tracking", t.tracking],
                            ].filter(([, v]) => v)}
                        />
                    </Card>
                </div>

                {/* ---------- Right Column ---------- */}

                <div className="stack gap-24 sticky-col">

                    <AutoChecks
                        c={c}
                        resolved={resolved}
                    />

                    {/* ---------- Flags ---------- */}

                    {c.flags.length > 0 && (
                        <Card>
                            <div className="row gap-8">
                                <TriangleAlert
                                    size={18}
                                    color="var(--danger)"
                                />

                                <h2 className="h3">
                                    {USE_MOCK
                                        ? "Demo warning indicators"
                                        : "Why it's flagged"}
                                </h2>
                            </div>

                            {c.flags.map((f) => (
                                <div
                                    key={f.text}
                                    className="flag-row"
                                >
                                    <Flag
                                        size={16}
                                        color={
                                            f.level === "high"
                                                ? "var(--danger)"
                                                : "var(--warn)"
                                        }
                                        style={{
                                            marginTop: 3,
                                            flex: "none",
                                        }}
                                    />

                                    <span>
                                        {f.text}
                                    </span>
                                </div>
                            ))}
                        </Card>
                    )}

                    {/* ---------- Decision ---------- */}

                    <Card>
                        <div className="row gap-8">
                            <Gavel
                                size={18}
                                color="var(--navy-700)"
                            />

                            <h2 className="h3">
                                Your decision
                            </h2>
                        </div>

                        {resolved ? (
                            <Notice icon={UserCheck}>
                                This case is resolved.
                                The decision is in the
                                audit log below.
                            </Notice>
                        ) : (
                            <>
                                <div
                                    className="stack gap-8"
                                    role="radiogroup"
                                    aria-label="Choose an action"
                                >
                                    {c.options.map((o) => (
                                        <RadioCard
                                            key={o.id}
                                            selected={
                                                chosen?.id === o.id
                                            }
                                            onClick={() =>
                                                setChoice(o.id)
                                            }
                                            title={o.title}
                                            sub={o.sub}
                                            right={
                                                o.recommended && (
                                                    <Badge level="info">
                                                        Demo suggestion
                                                    </Badge>
                                                )
                                            }
                                        />
                                    ))}
                                </div>

                                {c.recommendation && (
                                    <div className="notice">
                                        <Sparkles
                                            size={18}
                                            color="var(--blue-600)"
                                        />

                                        <span>
                                            <b>
                                                Existing case suggestion:
                                            </b>{" "}
                                            {c.recommendation}
                                        </span>
                                    </div>
                                )}

                                {analysis?.recommendation && (
                                    <p className="small muted">
                                        Python analysis recommendation:
                                        {" "}
                                        {analysis.recommendation}
                                    </p>
                                )}

                                <Button
                                    block
                                    onClick={act}
                                    disabled={!chosen}
                                >
                                    {isInfo(chosen) ? (
                                        <>
                                            <Send size={16} />
                                            {USE_MOCK
                                                ? "Simulate information request"
                                                : "Request info through PayPal"}
                                        </>
                                    ) : (
                                        <>
                                            <Gavel size={16} />
                                            Review and record decision
                                        </>
                                    )}
                                </Button>

                                <div className="row gap-8 wrap">
                                    <Button
                                        kind="secondary"
                                        size="sm"
                                        onClick={() =>
                                            openInfo("buyer")
                                        }
                                    >
                                        Ask the buyer
                                    </Button>

                                    <Button
                                        kind="secondary"
                                        size="sm"
                                        onClick={() =>
                                            openInfo("merchant")
                                        }
                                    >
                                        Ask the merchant
                                    </Button>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* ---------- Audit Log ---------- */}

                    <Card>
                        <div className="row gap-8">
                            <ScrollText
                                size={18}
                                color="var(--navy-700)"
                            />

                            <h2 className="h3">
                                Audit log
                            </h2>
                        </div>

                        {c.audit?.length ? (
                            c.audit.map((a, i) => (
                                <div
                                    key={
                                        a.id ??
                                        `row-${i}`
                                    }
                                    className="stack gap-4"
                                >
                                    <span className="small muted">
                                        {a.at}
                                        {" · "}
                                        {STAFF[a.by] ??
                                            a.by}
                                    </span>

                                    <span className="body-strong">
                                        {a.action}
                                    </span>

                                    <span className="small text-2">
                                        {a.decision}

                                        {a.notes
                                            ? ` · "${a.notes}"`
                                            : ""}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="small muted">
                                No actions yet.
                            </p>
                        )}

                        <Link
                            to="/audit"
                            className="link small"
                        >
                            Full audit log
                        </Link>
                    </Card>
                </div>
            </div>

            {/* ---------- Decision Modal ---------- */}

            {modal === "decide" && chosen && (
                <Modal
                    onClose={() =>
                        setModal(null)
                    }
                >
                    <h2 className="h2">
                        Record this decision?
                    </h2>

                    <div className="card soft tight">
                        <KV
                            rows={[
                                ["Case", c.id],
                                ["Action", chosen.title],
                                [
                                    "Existing suggestion",
                                    recommended?.title ?? "–",
                                ],
                                ["Decided by", staff.name],
                            ]}
                        />
                    </div>

                    {movesMoney(chosen) && (
                        <Notice
                            icon={TriangleAlert}
                            tone="warm"
                        >
                            {USE_MOCK
                                ? "Demo mode: this action is simulated and does not move money."
                                : "This action may move money. Review carefully before confirming."}
                        </Notice>
                    )}

                    <Textarea
                        label={
                            chosen.id === recommended?.id
                                ? "Notes (optional)"
                                : "Why are you choosing a different action? (required)"
                        }
                        rows={3}
                        value={notes}
                        onChange={(e) =>
                            setNotes(e.target.value)
                        }
                    />

                    <div className="row gap-12 end">
                        <Button
                            kind="secondary"
                            onClick={() =>
                                setModal(null)
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={() =>
                                decide.mutate()
                            }
                            disabled={
                                decide.isPending ||
                                (
                                    chosen.id !==
                                    recommended?.id &&
                                    !notes.trim()
                                )
                            }
                        >
                            {decide.isPending
                                ? "Recording…"
                                : "Confirm decision"}
                        </Button>
                    </div>
                </Modal>
            )}

            {/* ---------- Request Info Modal ---------- */}

            {modal === "info" && (
                <Modal
                    onClose={() =>
                        setModal(null)
                    }
                >
                    <h2 className="h2">
                        Request more information
                    </h2>

                    <p className="text-2">
                        {USE_MOCK
                            ? `Demo mode: this request to the ${party} will be simulated. No PayPal message will be sent.`
                            : `PayPal sends this to the ${party} in the Resolution Center.`}
                    </p>

                    <Chips
                        value={party}
                        onChange={(v) =>
                            setParty(v)
                        }
                        items={[
                            {
                                value: "merchant",
                                label: "Merchant",
                            },
                            {
                                value: "buyer",
                                label: "Buyer",
                            },
                        ]}
                    />

                    <Textarea
                        label="Message"
                        rows={5}
                        value={message}
                        onChange={(e) =>
                            setMessage(e.target.value)
                        }
                    />

                    <p className="small muted">
                        {USE_MOCK
                            ? "This is a simulated request."
                            : "Their reply comes back to this case."}
                    </p>

                    <div className="row gap-12 end">
                        <Button
                            kind="secondary"
                            onClick={() =>
                                setModal(null)
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={() =>
                                ask.mutate()
                            }
                            disabled={
                                ask.isPending ||
                                !message.trim()
                            }
                        >
                            <Send size={16} />

                            {ask.isPending
                                ? "Sending…"
                                : USE_MOCK
                                    ? "Simulate request"
                                    : "Send through PayPal"}
                        </Button>
                    </div>
                </Modal>
            )}

            {toast}
        </>
    );
}