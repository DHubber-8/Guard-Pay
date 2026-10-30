import { CircleCheck, CircleHelp, CircleDashed, TriangleAlert, Sparkles } from "lucide-react";
import { Card, Badge, RiskBadge } from "./ui";

// Follows docs/RULES.md: risk (low/medium/high) is shown separately from the
// evidence status (complete/partial/missing), every evidence item is labelled
// verified or unverified, and we never show invented probabilities.
const KIND = {
  verified: { icon: CircleCheck, color: "var(--ok)", label: "Verified" },
  unverified: { icon: CircleHelp, color: "var(--warn)", label: "Unverified" },
  missing: { icon: CircleDashed, color: "var(--muted)", label: "Not provided" },
  contradiction: { icon: TriangleAlert, color: "var(--danger)", label: "Contradicts other evidence" },
};

const EVIDENCE = {
  complete: ["low", "Evidence: complete"],
  partial: ["medium", "Evidence: partial"],
  missing: ["high", "Evidence: missing"],
};

export function EvidenceBadge({ status }) {
  const [tone, label] = EVIDENCE[status] || EVIDENCE.partial;
  return <Badge level={tone}>{label}</Badge>;
}

/** The AI's findings: risk, evidence status, what was checked, suggested action. */
export default function FindingsPanel({ risk, evidenceStatus, rows, action, title = "AI findings" }) {
  return (
    <Card>
      <div className="row between wrap gap-8">
        <div className="row gap-8"><Sparkles size={18} color="var(--gold-500)" /><span className="h3">{title}</span></div>
        <div className="row gap-8 wrap"><RiskBadge level={risk} /><EvidenceBadge status={evidenceStatus} /></div>
      </div>
      <div className="stack gap-12">
        {rows.map((r) => {
          const k = KIND[r.kind];
          const Icon = k.icon;
          return (
            <div key={r.text} className="row gap-12" style={{ alignItems: "flex-start" }}>
              <Icon size={18} color={k.color} style={{ marginTop: 3, flex: "none" }} />
              <div className="stack">
                <span>{r.text}</span>
                <span className="small muted">{k.label} · {r.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
      {action && <div className="notice"><Sparkles size={18} color="var(--navy-700)" /><span><b>Suggested (you decide):</b> {action}</span></div>}
    </Card>
  );
}
