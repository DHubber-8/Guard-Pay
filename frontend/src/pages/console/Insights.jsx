// Team insights: case volume, reasons, how often staff agree with the AI, and rising patterns.
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { Card, Badge, Skeleton, Notice } from "../../components/ui";
import { LineChart, BarList } from "../../components/Charts";

export default function Insights() {
  const { data: d, isError } = useQuery({ queryKey: ["insights"], queryFn: api.getInsights, retry: false });
  if (isError) return (
    <>
      <div className="page-head"><div><h1 className="h1">Insights</h1></div></div>
      <Notice>Insights aren't available yet. They appear once the backend sends them.</Notice>
    </>
  );
  if (!d) return <Skeleton h={420} />;
  const s = d.stats;
  return (
    <>
      <div className="page-head">
        <div><h1 className="h1">Insights</h1><p>Last 5 weeks · Disputes team, US</p></div>
      </div>
      <div className="grid-4">
        {[["Avg. time to decision", `${s.avgHoursToDecision} h`], ["Misunderstandings", s.misunderstandings], ["Staff agreed with AI", s.aiAgreed], ["Flags this week", s.flagsThisWeek]].map(([l, v]) => (
          <Card key={l} className="stat"><span className="caption muted">{l}</span><span className="stat-value">{v}</span></Card>
        ))}
      </div>
      <div className="grid-2">
        <Card>
          <h2 className="h3">Cases per week</h2>
          <LineChart labels={d.weeks} series={[
            { name: "Opened", values: d.opened, color: "var(--blue-600)" },
            { name: "Closed", values: d.closed, color: "var(--navy-700)" },
          ]} />
        </Card>
        <Card><h2 className="h3">Reasons (% of cases)</h2><BarList rows={d.reasons} color="var(--blue-600)" /></Card>
      </div>
      <Card className="flush">
        <div style={{ padding: "18px 20px" }}><h2 className="h3">Patterns to watch</h2></div>
        <table className="table">
          <thead><tr><th>Pattern</th><th>Trend</th><th>Detail</th></tr></thead>
          <tbody>{d.patterns.map(([p, t, x]) => <tr key={p}><td className="body-strong">{p}</td><td><Badge level={t === "Rising" ? "medium" : "neutral"}>{t}</Badge></td><td>{x}</td></tr>)}</tbody>
        </table>
      </Card>
    </>
  );
}
