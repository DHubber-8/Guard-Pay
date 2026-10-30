// 01b–01d. Opens when a feature card on the landing page is clicked: /features/:id
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, MessageSquare, ScanSearch, FileText, CircleCheck, TriangleAlert, Package } from "lucide-react";
import { Button, Card, Badge, RiskBadge } from "../../components/ui";
import ink from "../../assets/art/ink.webp";
import pastel from "../../assets/art/pastel.webp";
import dunes from "../../assets/art/dunes.webp";
import { Deco } from "../../components/Art";

const PAGES = {
  "order-help": {
    icon: MessageSquare, title: "Order Help", art: pastel,
    text: "Buyers ask about an order from the store or an email link. The AI answers misunderstandings in seconds with proof, and sends real problems to the merchant.",
    points: ["No PayPal account needed", "Instant answers with tracking proof", "Merchant approves any refund"],
    cta: ["Try the buyer view", "/store"],
    preview: <OrderHelpPreview />,
  },
  "scam-check": {
    icon: ScanSearch, title: "Scam Check", art: ink,
    text: "Paste or upload a suspicious email, message or charge. The AI checks it against real payments and known scam patterns, then tells you how risky it is.",
    points: ["For merchants and individuals", "Risk level with clear reasons", "Safe next steps, never asks for passwords"],
    cta: ["Start a Scam Check", "/scam-check"],
    preview: <ScamPreview />,
  },
  "dispute-helper": {
    icon: FileText, title: "Dispute Helper & Insights", art: dunes,
    text: "When a formal dispute arrives, the AI builds the case file, scores your evidence and drafts the response. Insights show what causes problems.",
    points: ["Case file ready in minutes", "Evidence checklist: verified or not", "Trends by product and reason"],
    cta: ["Create a business account", "/signup/business"],
    preview: <DisputePreview />,
  },
};

export default function FeaturePage() {
  const { id } = useParams();
  const p = PAGES[id];
  if (!p) {
    return (
      <div className="page stack gap-16" style={{ minHeight: "60vh", justifyContent: "center", alignItems: "center" }}>
        <h1 className="h2">Feature not found</h1>
        <Button to="/">Back to home</Button>
      </div>
    );
  }
  const others = Object.entries(PAGES).filter(([k]) => k !== id);
  return (
    <>
      <section className="section-deco" style={{ background: "var(--cream-100)" }}>
        <Deco kind="blobs" />
        <div className="page" style={{ paddingTop: 40, paddingBottom: 64 }}>
        <Link to="/#features" className="crumb"><ArrowLeft size={16} /> All features</Link>
        <div className="grid-2" style={{ alignItems: "center", gap: 56, marginTop: 24 }}>
          <div className="stack gap-24">
            <span className="caption accent-text">Feature</span>
            <h1 className="display">{p.title}</h1>
            <p className="text-2" style={{ fontSize: 18, lineHeight: "28px" }}>{p.text}</p>
            <ul className="icon-list" style={{ fontSize: 17 }}>
              {p.points.map((t) => (
                <li key={t}><span className="icon-bubble ok" style={{ width: 28, height: 28, borderRadius: 8 }}><Check size={16} /></span>{t}</li>
              ))}
            </ul>
            <div className="row gap-12"><Button to={p.cta[1]}>{p.cta[0]}</Button><Button kind="secondary" to="/start">Sign up</Button></div>
          </div>
          <div className="art" style={{ minHeight: 520, display: "grid", placeItems: "center", padding: 32 }}>
            <img src={p.art} alt="" style={{ position: "absolute", inset: 0 }} />
            <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>{p.preview}</div>
          </div>
        </div>
        </div>
      </section>
      <section className="section-deco" style={{ background: "var(--mist-50)" }} id="insights">
        <Deco kind="waves" />
        <div className="page" style={{ paddingTop: 56, paddingBottom: 120 }}>
        <h2 className="h3" style={{ marginBottom: 16 }}>Other features</h2>
        <div className="grid-2">
          {others.map(([k, o]) => (
            <Link key={k} to={`/features/${k}`} className="card clickable row gap-16" style={{ flexDirection: "row", alignItems: "center" }}>
              <span className="icon-bubble lg"><o.icon size={24} /></span>
              <div className="grow stack gap-4"><span className="h3">{o.title}</span><span className="small muted">{o.points[0]}</span></div>
            </Link>
          ))}
        </div>
        </div>
      </section>
    </>
  );
}

function OrderHelpPreview() {
  return (
    <Card style={{ boxShadow: "var(--shadow-lg)" }}>
      <Badge level="info">Answered instantly</Badge>
      <h3 className="h3">Good news: your parcel is on its way</h3>
      <p className="small text-2">It's held at customs in Singapore, which is normal. It should be released in about 2 days.</p>
      <ul className="icon-list small">
        <li><CircleCheck size={16} color="var(--ok)" />Shipped · 20 Oct</li>
        <li><CircleCheck size={16} color="var(--ok)" />Held at customs · 26 Oct</li>
        <li><Package size={16} color="var(--muted)" /><span className="muted">Out for delivery · ~28 Oct</span></li>
      </ul>
    </Card>
  );
}

function ScamPreview() {
  return (
    <Card style={{ boxShadow: "var(--shadow-lg)" }}>
      <div className="row gap-8"><RiskBadge level="high" /><Badge level="low">Evidence: complete</Badge></div>
      <h3 className="h3">Signs of a fake payment email</h3>
      <ul className="icon-list small">
        <li><TriangleAlert size={16} color="var(--danger)" />Sender domain is not paypal.com</li>
        <li><TriangleAlert size={16} color="var(--danger)" />No matching payment in your account</li>
      </ul>
    </Card>
  );
}

function DisputePreview() {
  return (
    <Card style={{ boxShadow: "var(--shadow-lg)" }}>
      <span className="small muted">Dispute PP-D-27891 · Item not received</span>
      <div className="row between"><span className="body-strong">Evidence</span><Badge level="medium">Partial · 3 of 4 verified</Badge></div>
      <div className="row gap-4">{[1, 1, 1, 0].map((v, i) => <div key={i} style={{ flex: 1, height: 10, borderRadius: 99, background: v ? "var(--ok)" : "var(--cream-200)" }} />)}</div>
      <p className="small text-2">A delivery photo would complete it.</p>
    </Card>
  );
}
