// 07 Merchant home (dashboard) — includes the "Formal disputes" card with Manage disputes
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, ShieldAlert, Truck, CircleCheck, ChevronRight, Clock, ArrowRight } from "lucide-react";
import { api } from "../../api";
import { Button, Card, Badge, Skeleton } from "../../components/ui";
import { BarList } from "../../components/Charts";
import { insights } from "../../mock/data";
import PaypalBanner from "../../components/PaypalBanner";

const ICON = { dispute: [FileText, "danger"], orderhelp: [MessageSquare, ""], risk: [ShieldAlert, "warm"], delivery: [Truck, ""] };

export default function Home() {
  const { data: s } = useQuery({ queryKey: ["stats"], queryFn: api.getStats });
  const { data: cases } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const attention = cases?.slice(0, 5);

  return (
    <div className="stack gap-24">
      <PaypalBanner />
      <div className="stack gap-4">
        <span className="small muted">{today}</span>
        <h1 className="h1">Welcome back, Diana Richella</h1>
      </div>

      <div className="grid-4">
        {[
          ["Open cases", s?.openCases, `${s?.dueToday} due today`],
          ["Waiting for approval", s?.waitingApproval, `Oldest: ${s?.oldestWaitingHours} h`],
          ["Disputes prevented", s?.disputesPrevented, "This month"],
          ["Answered instantly", s?.answeredInstantly, "Buyers helped without you"],
        ].map(([label, value, sub]) => (
          <Card key={label} className="tight" style={{ padding: 20 }}>
            <span className="caption muted">{label}</span>
            {value == null ? <Skeleton h={48} w={80} /> : <span className="stat-value">{value}</span>}
            <span className="small muted">{s ? sub : ""}</span>
          </Card>
        ))}
      </div>

      {/* Formal disputes: the most urgent thing, so it gets its own card */}
      <Card className="dark" style={{ flexDirection: "row", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <span className="icon-bubble lg" style={{ background: "rgba(255,255,255,.1)", color: "var(--peach-200)" }}><FileText size={26} /></span>
        <div className="grow stack gap-4" style={{ minWidth: 240 }}>
          <span className="caption" style={{ color: "var(--peach-200)" }}>Formal disputes</span>
          <span className="h2">{s ? `${s.openDisputes} open · next due in ${s.nextDisputeDueDays} days` : "…"}</span>
          <span className="small" style={{ color: "#c9d3da" }}>PayPal disputes and chargebacks. The AI has a case file and draft response ready for each one.</span>
        </div>
        <Button kind="on-dark" to="/merchant/inbox?type=dispute">Manage disputes <ArrowRight size={18} /></Button>
      </Card>

      <div className="cols">
        <Card className="flush">
          <div className="row between" style={{ padding: "20px 24px" }}>
            <h2 className="h3">Needs your attention</h2>
            <Link to="/merchant/inbox" className="small body-strong" style={{ color: "var(--navy-700)" }}>View all</Link>
          </div>
          <hr className="divider" />
          {!attention && <div className="stack gap-12" style={{ padding: 24 }}><Skeleton /><Skeleton /><Skeleton /></div>}
          {attention?.map((c) => {
            const [Icon, tone] = ICON[c.type];
            const solved = c.status === "Solved";
            return (
              <Link to={c.link} key={c.id} className="list-row">
                <span className={`icon-bubble ${solved ? "ok" : tone}`}>{solved ? <CircleCheck size={20} /> : <Icon size={20} />}</span>
                <div className="grow stack">
                  <span className="body-strong">{c.title} · Order {c.order}</span>
                  <span className="small muted row gap-4">{c.deadlineHours < 24 && <Clock size={14} color="var(--danger)" />}{c.status}</span>
                </div>
                {c.type === "dispute" && <Badge level="high">Dispute</Badge>}
                {c.type === "risk" && <Badge level="medium">Risk</Badge>}
                {solved && <Badge level="low">Solved</Badge>}
                <ChevronRight size={18} color="var(--muted)" />
              </Link>
            );
          })}
        </Card>
        <Card>
          <h2 className="h3">Cases by reason</h2>
          <BarList rows={insights.reasons} />
          <p className="small muted">Top reason: Item not received (45%)</p>
          <Button kind="secondary" size="sm" to="/merchant/insights" style={{ alignSelf: "flex-start" }}>Open Insights</Button>
        </Card>
      </div>
    </div>
  );
}
