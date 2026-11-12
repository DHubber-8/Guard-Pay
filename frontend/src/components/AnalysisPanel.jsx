// Results of the case analysis (POST /cases/{id}/analyze, Role B pipeline).
// It expects the shape returned by toAnalysis() in api/analysisAdapter.js:
//   { scenario, risk, riskScore, scoreCaveat, evidenceStatus, completeness,
//     present: [key], missing: [key], indicators: [{ name, description }],
//     explanation, suggestedAction, needsReview, draft }
// Follows docs/RULES.md: risk is shown apart from evidence, the score is a
// heuristic warning score (not a probability), and nothing here decides a case.
import { CheckCircle2, CircleSlash, TriangleAlert } from "lucide-react";
import { Badge, RiskBadge, Notice } from "./ui";
import { EvidenceBadge } from "./FindingsPanel";
import { SCENARIO_LABEL, humanize } from "../labels";

export default function AnalysisPanel({ result: r }) {
  const pct = Math.round((r.completeness ?? 0) * 100);
  return (
    <div className="stack gap-16 analysis">
      <div className="row between wrap gap-8">
        <span className="body-strong">{SCENARIO_LABEL[r.scenario] ?? (r.scenario ? humanize(r.scenario) : "Scenario not identified")}</span>
        <div className="row gap-8 wrap">
          <RiskBadge level={r.risk} />
          <EvidenceBadge status={r.evidenceStatus} />
          {r.needsReview && <Badge level="medium">Needs review</Badge>}
        </div>
      </div>

      {r.explanation && <p>{r.explanation}</p>}

      <div className="grid-2 gap-16">
        <div className="stack gap-8">
          <span className="small body-strong">Warning signs</span>
          {r.indicators?.length ? r.indicators.map((i) => (
            <div key={i.id ?? i.name} className="row gap-8 analysis-item">
              <TriangleAlert size={16} color="var(--warn)" />
              <span className="stack gap-4"><span>{humanize(i.name)}</span>{i.description && <span className="small muted">{i.description}</span>}</span>
            </div>
          )) : <p className="small muted">No warning signs were reported for this case.</p>}
          {r.riskScore != null && (
            <p className="small muted">Warning score {r.riskScore}/100. {r.scoreCaveat || "A heuristic score, not a probability of fraud."}</p>
          )}
        </div>

        <div className="stack gap-8">
          <span className="small body-strong">Required evidence · {pct}% present</span>
          <div className="meter" role="img" aria-label={`${pct}% of required evidence present`}><div style={{ width: `${pct}%` }} /></div>
          {r.present?.map((k) => (
            <div key={k} className="row gap-8 analysis-item"><CheckCircle2 size={16} color="var(--ok)" /><span>{humanize(k)}</span></div>
          ))}
          {r.missing?.map((k) => (
            <div key={k} className="row gap-8 analysis-item"><CircleSlash size={16} color="var(--danger)" /><span>{humanize(k)} <span className="small muted">missing</span></span></div>
          ))}
        </div>
      </div>

      {r.suggestedAction && <Notice>{r.suggestedAction}</Notice>}

      {r.draft && (
        <details className="analysis-draft">
          <summary className="small body-strong">Draft response (review before using)</summary>
          <pre>{r.draft}</pre>
        </details>
      )}

      <p className="small muted">Decision support from PayPal records. It is not a fraud determination, and a person makes every decision.</p>
    </div>
  );
}
