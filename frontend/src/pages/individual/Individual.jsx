// 17 Individual home · 18 Individual account
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { setRole } from "../../session";
import { ShieldCheck, ChevronRight, History, Trash2, User } from "lucide-react";
import { Mobile } from "../../layouts/layouts";
import { Button, Card, Badge, RiskBadge, Input, Notice, useToast } from "../../components/ui";
import { scamHistory } from "../../mock/data";
import ink from "../../assets/art/ink.webp";

function Row({ to, onClick, title, sub, right }) {
  const inner = (<><div className="grow stack"><span className="body-strong">{title}</span><span className="small muted">{sub}</span></div>{right}</>);
  const style = { flexDirection: "row", alignItems: "center", textAlign: "left", width: "100%", font: "inherit" };
  return to
    ? <Link to={to} className="card tight clickable" style={style}>{inner}</Link>
    : <button type="button" onClick={onClick} className="card tight clickable" style={style}>{inner}</button>;
}

export function IndividualHome() {
  useEffect(() => setRole("individual"), []); // demo: opening this counts as signed in
  return (
    <Mobile title="Hi, Maya" back={false} tabs wide>
      <div className="art ind-hero">
        <img src={ink} alt="" style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,35,46,.45), rgba(20,35,46,.78))" }} />
        <div className="stack gap-16" style={{ position: "relative", color: "white", justifyContent: "center", alignItems: "center", textAlign: "center", height: "100%" }}>
          <ShieldCheck size={30} color="var(--peach-200)" />
          <p className="h2" style={{ maxWidth: 560 }}>Got a message, link or payment that feels off?</p>
          <Button kind="on-dark" to="/scam-check" style={{ minWidth: 260 }}>Check something suspicious</Button>
        </div>
      </div>
      <div className="ind-grid">
        <Card className="tight ind-section">
          <div className="row between"><h2 className="h3">Recent Scam Checks</h2><Link to="/me/history" className="small body-strong" style={{ color: "var(--navy-700)" }}>See all</Link></div>
          {scamHistory.map((s) => <Row key={s.id} to="/scam-check/result" title={s.title} sub={s.when} right={<RiskBadge level={s.risk} />} />)}
        </Card>
        <div className="stack gap-16">
          <Card className="tight ind-section">
            <h2 className="h3">Order Help requests</h2>
            <Row to="/help/diana-richella/waiting" title="Diana Richella · #1032" sub="Waiting for the seller" right={<Badge level="info">Open</Badge>} />
          </Card>
          <Card className="tight ind-section">
            <h2 className="h3">Safety tip</h2>
            <Notice tone="warm">PayPal will never ask for your password or a one-time code by phone, email or chat.</Notice>
          </Card>
        </div>
      </div>
    </Mobile>
  );
}

const HISTORY = [
  ...scamHistory.map((s) => ({ ...s, kind: "Scam Check", to: "/scam-check/result" })),
  { id: "s0", title: "Email: \"Your account will be closed\"", when: "3 weeks ago", risk: "high", kind: "Scam Check", to: "/scam-check/result" },
  { id: "o1", title: "Diana Richella · #1032", when: "Waiting for the seller", kind: "Order Help", to: "/help/diana-richella/waiting", badge: ["info", "Open"] },
  { id: "o0", title: "Diana Richella · #0988", when: "Solved · partial refund $14", kind: "Order Help", to: "/help/diana-richella/resolved", badge: ["low", "Solved"] },
];

export function IndividualHistory() {
  const [filter, setFilter] = useState("All");
  const items = HISTORY.filter((h) => filter === "All" || h.kind === filter);
  return (
    <Mobile title="My check history" wide>
      <Card className="tight ind-section">
      <div className="chips">{["All", "Scam Check", "Order Help"].map((f) => <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>)}</div>
      {items.map((h) => (
        <Row key={h.id} to={h.to} title={h.title} sub={`${h.kind} · ${h.when}`}
          right={h.risk ? <RiskBadge level={h.risk} /> : <Badge level={h.badge[0]}>{h.badge[1]}</Badge>} />
      ))}
      <p className="small muted center">Uploads are deleted after 30 days. The summaries stay here.</p>
      </Card>
    </Mobile>
  );
}

export function IndividualAccount() {
  const [toast, showToast] = useToast();
  return (
    <Mobile title="Account" back={false} tabs wide>
      <div className="ind-grid">
        <Card className="ind-section">
          <div className="row gap-16">
            <span className="avatar" style={{ width: 56, height: 56 }}><User size={24} /></span>
            <div className="grow stack"><span className="body-strong">Maya Lim</span><span className="small muted">maya@email.com</span></div>
          </div>
          <Input label="Name" defaultValue="Maya Lim" />
          <Input label="Email" defaultValue="maya@email.com" />
          <Button onClick={() => showToast("Profile saved")} style={{ alignSelf: "flex-start" }}>Save changes</Button>
        </Card>
        <Card className="tight ind-section">
          <h2 className="h3">Privacy</h2>
          <Row to="/me/history" title="My check history" sub="Every Scam Check and Order Help request" right={<History size={18} color="var(--muted)" />} />
          <Row onClick={() => showToast("Scam Check history deleted")} title="Delete my Scam Check history" sub="Uploads are removed after 30 days anyway" right={<Trash2 size={18} color="var(--muted)" />} />
          <Button kind="secondary" block to="/" onClick={() => setRole(null)}>Log out</Button>
        </Card>
      </div>
      {toast}
    </Mobile>
  );
}
