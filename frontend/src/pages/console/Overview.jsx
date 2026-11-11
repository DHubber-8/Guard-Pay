// Staff home: today's workload, my most urgent cases and new flags.
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flag, Clock, Truck, Radar } from "lucide-react";
import { api } from "../../api";
import { Card, RiskBadge, Badge, Skeleton } from "../../components/ui";
import { REASON_LABEL, money, due } from "../../labels";
import { useStaff } from "../../session";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export default function Overview() {
  const nav = useNavigate();
  const staff = useStaff();
  const { data: cases } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
  const { data: flagData, isError: flagsMissing } = useQuery({ queryKey: ["flags"], queryFn: api.getFlags, retry: false });
  const flags = flagData ?? (flagsMissing ? [] : null);
  const { data: watch } = useQuery({ queryKey: ["watch"], queryFn: api.getWatchStatus, retry: false });
  if (!cases || !flags) return <><Skeleton h={40} w={320} /><Skeleton h={110} /><Skeleton h={320} /></>;

  const open = cases.filter((c) => c.status !== "Resolved");
  const mine = open.filter((c) => c.assignee === staff.id).sort((a, b) => a.deadlineHours - b.deadlineHours);
  const stats = [
    ["Open cases", open.length, "/queue"],
    ["Due in 24 h", open.filter((c) => c.deadlineHours < 24).length, "/queue?view=due", true],
    ["High risk", open.filter((c) => c.risk === "high").length, "/queue?view=high", true],
    ["Waiting for info", open.filter((c) => c.status.startsWith("Waiting")).length, "/queue?view=waiting"],
  ];
  return (
    <>
      <div className="page-head">
        <div><h1 className="h1">{greeting()}, {staff.name.split(" ")[0]}</h1><p>Disputes from PayPal, checked and summarised before you open them.</p></div>
      </div>
      <div className="grid-4">
        {stats.map(([label, value, to, alert]) => (
          <Card key={label} className={`stat ${alert && value > 0 ? "alert" : ""}`}>
            <span className="caption muted">{label}</span>
            <span className="stat-value">{value}</span>
            <Link to={to} className="link">View</Link>
          </Card>
        ))}
      </div>
      {watch && (
        <Card className="tight">
          <div className="row gap-8"><Radar size={18} color="var(--blue-600)" /><h2 className="h3">Automatic checks</h2></div>
          <div className="grid-2">
            <Link to="/queue?view=due" className="watch-row">
              <Clock size={18} />
              <span className="grow stack gap-4"><span className="body-strong">Deadline watch</span><span className="small text-2">{stats[1][1]} open case{stats[1][1] === 1 ? "" : "s"} due in 24 h · reminders go to the assigned staff</span><span className="small muted">Last run {watch.deadline.lastRun} · {watch.deadline.every.toLowerCase()}</span></span>
            </Link>
            <Link to="/flags" className="watch-row">
              <Truck size={18} />
              <span className="grow stack gap-4"><span className="body-strong">Delivery watch</span><span className="small text-2">{open.filter((c) => c.delivery).length} shipments watched · {open.filter((c) => c.delivery === "stuck" || c.delivery === "lost" || (c.delivery === "delivered" && c.flagged && c.reason === "item_not_received")).length} need a look</span><span className="small muted">Last run {watch.delivery.lastRun} · {watch.delivery.every.toLowerCase()}</span></span>
            </Link>
          </div>
        </Card>
      )}
      <div className="cols">
        <Card className="flush">
          <div className="row between" style={{ padding: "18px 20px" }}>
            <h2 className="h3">My cases · most urgent first</h2>
            <Link to="/queue?view=mine" className="link small row gap-4" style={{ whiteSpace: "nowrap" }}>Open queue <ArrowRight size={14} /></Link>
          </div>
          <table className="table">
            <thead><tr><th>Case</th><th>Reason</th><th>Amount</th><th>Due</th><th>Risk</th></tr></thead>
            <tbody>
              {mine.slice(0, 6).map((c) => (
                <tr key={c.id} className="clickable" onClick={() => nav(`/cases/${c.id}`)}>
                  <td><Link to={`/cases/${c.id}`} className="body-strong">{c.id}</Link><div className="small muted">{c.buyer} → {c.merchant}</div></td>
                  <td>{REASON_LABEL[c.reason] ?? c.reason}</td>
                  <td>{money(c.amount)}</td>
                  <td className={c.deadlineHours < 24 ? "deadline soon" : ""}>{due(c.deadlineHours)}</td>
                  <td><RiskBadge level={c.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <div className="row between"><h2 className="h3">New flags</h2><Link to="/flags" className="link small">See all</Link></div>
          {flags.length === 0 && <p className="small muted">No new flags.</p>}
          {flags.slice(0, 4).map((f) => (
            <Link key={f.id} to={f.case ? `/cases/${f.case}` : `/checks?q=${encodeURIComponent(f.query)}`} className="flag-row">
              <Flag size={16} color={f.level === "high" ? "var(--danger)" : "var(--warn)"} style={{ marginTop: 3, flex: "none" }} />
              <span className="stack gap-4"><span className="body-strong">{f.subject}</span><span className="small text-2">{f.text}</span><span className="small muted row gap-4"><Clock size={12} />{f.when} · <Badge level={f.level}>{f.kind}</Badge></span></span>
            </Link>
          ))}
        </Card>
      </div>
    </>
  );
}
