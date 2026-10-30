import { Link } from "react-router-dom";
import { MessageSquare, ScanSearch, FileText, ChartColumn, Upload, Sparkles, CircleCheck, Store, ShieldCheck, ArrowRight, Mail, Package } from "lucide-react";
import { Button, Card, Badge, Reveal } from "../../components/ui";
import { SUPPORT_EMAIL } from "../../config";
import { HeroArt, Deco } from "../../components/Art";
import agate from "../../assets/art/agate.webp";

export const FEATURES = [
  { id: "order-help", icon: MessageSquare, title: "Order Help", text: "Buyers ask about an order and get an instant, evidence-based answer." },
  { id: "scam-check", icon: ScanSearch, title: "Scam Check", text: "Upload a suspicious message or charge and see the risk level and safe next steps." },
  { id: "dispute-helper", icon: FileText, title: "Dispute Helper", text: "When a formal dispute happens, the AI builds the case file and drafts your response." },
  { id: "dispute-helper", icon: ChartColumn, title: "Business Insights", text: "See which products and reasons cause the most problems.", anchor: "insights" },
];

const STEPS = [
  [Upload, "Ask or upload", "The buyer describes the problem, or anyone uploads a suspicious message."],
  [Sparkles, "AI checks the facts", "Tracking, payments and known scam patterns are checked in seconds."],
  [CircleCheck, "Solved with proof", "Misunderstandings are cleared instantly; real problems go to the merchant to approve."],
];

// Smooth-scroll to a section on this page (used by the hero buttons)
const scrollTo = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function SectionHead({ eyebrow, title, light }) {
  return (
    <div className="stack gap-12" style={{ marginBottom: 40 }}>
      <span className="caption" style={{ color: light ? "var(--peach-200)" : "var(--terracotta-700)" }}>{eyebrow}</span>
      {title && <h2 className="h1" style={light ? { color: "white" } : undefined}>{title}</h2>}
    </div>
  );
}

/** Explanation picture for the hero: a buyer question answered by the AI with proof. */
function HeroExplainer() {
  return (
    <div className="stack gap-16 hero-explainer" style={{ color: "var(--text)", width: "100%", maxWidth: 440, marginLeft: "auto" }}>
      <div className="bubble me float-1" style={{ maxWidth: "78%", boxShadow: "var(--shadow-md)", background: "var(--white)", color: "var(--navy-900)", border: "1px solid var(--line)" }}>
        <span className="caption muted" style={{ display: "block", marginBottom: 4 }}>Buyer · Order #1032</span>
        Where is my order? It's been 9 days and nothing has arrived.
      </div>
      <Card className="float-2" style={{ boxShadow: "var(--shadow-lg)", gap: 14 }}>
        <div className="row between">
          <span className="row gap-8 small body-strong"><Sparkles size={16} color="var(--gold-500)" />AI checked DHL tracking</span>
          <Badge level="info">4 seconds</Badge>
        </div>
        <p className="body-strong">Your parcel is held at customs in Singapore. This is normal and it should be released in about 2 days.</p>
        <ul className="icon-list small">
          <li><CircleCheck size={16} color="var(--ok)" />Shipped · 20 Oct</li>
          <li><CircleCheck size={16} color="var(--ok)" />Held at customs · 26 Oct</li>
          <li><Package size={16} color="var(--muted)" /><span className="muted">Out for delivery · ~28 Oct</span></li>
        </ul>
      </Card>
      <div className="row gap-12 float-3" style={{ alignSelf: "flex-end", background: "var(--white)", padding: "10px 16px", borderRadius: 999, boxShadow: "var(--shadow-md)" }}>
        <span className="icon-bubble ok" style={{ width: 28, height: 28, borderRadius: 99 }}><CircleCheck size={16} /></span>
        <span className="small body-strong">Solved with proof · no dispute opened</span>
      </div>
    </div>
  );
}

/** Card with a moodboard photo behind a soft white fade (used in "Who it's for"). */
function PhotoCard({ img, icon: Icon, title, text, actions, warm }) {
  return (
    <div className="art lift" style={{ minHeight: 300 }}>
      <img src={img} alt="" style={{ position: "absolute", inset: 0, filter: warm ? "sepia(.22) saturate(1.1) hue-rotate(-8deg) brightness(1.04)" : undefined }} />
      <div style={{ position: "absolute", inset: 0, background: warm ? "linear-gradient(90deg, rgba(255,252,250,.94) 0%, rgba(255,250,246,.72) 65%, rgba(255,246,240,.3) 100%)" : "linear-gradient(90deg, rgba(255,255,255,.94) 0%, rgba(255,255,255,.72) 65%, rgba(255,255,255,.3) 100%)" }} />
      <div style={{ position: "relative", padding: 40, display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
        <Icon size={32} color="var(--navy-700)" />
        <h3 className="h2">{title}</h3>
        <p className="text-2 grow">{text}</p>
        <div className="row gap-12 wrap">{actions}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      {/* Hero: full-width artwork, darkened so the text stays readable */}
      <section className="hero section-deco">
        <HeroArt />
        <div className="hero-shade" />
        <div className="page grid-2" style={{ alignItems: "center", gap: 56, paddingTop: 96, paddingBottom: 112 }}>
          <div className="stack gap-24 hero-copy">
            <span className="caption" style={{ color: "var(--peach-200)" }}>For online stores and their buyers</span>
            <h1 className="display" style={{ color: "white" }}>Clear up order problems and scams in seconds, <em style={{ color: "var(--peach-200)" }}>with proof</em></h1>
            <p style={{ fontSize: 18, lineHeight: "28px", maxWidth: 540, color: "#d6e0e6" }}>
              Our AI answers buyers' questions instantly, checks suspicious messages, and helps merchants solve real problems before they become disputes.
            </p>
            <div className="row gap-12 wrap">
              <a href="#who" onClick={scrollTo("who")} className="btn on-dark">I run an online store</a>
              <a href="#who" onClick={scrollTo("who")} className="btn secondary" style={{ background: "transparent", color: "white", borderColor: "rgba(255,255,255,.7)" }}>Check something suspicious</a>
            </div>
          </div>
          <HeroExplainer />
        </div>
      </section>

      {/* About · white */}
      <section id="about" className="section section-deco" style={{ background: "var(--white)" }}>
        <Deco kind="blobs" />
        <Reveal className="page grid-2" style={{ gap: 56 }}>
          <div className="stack gap-12">
            <span className="caption accent-text">About us</span>
            <h2 className="h1">Most disputes are just misunderstandings</h2>
          </div>
          <p className="text-2" style={{ fontSize: 18, lineHeight: "30px" }}>
            A parcel held at customs. A charge name nobody recognises. A late reply from the seller. We clear these up with evidence the buyer can check, so neither side has to open a formal dispute.
          </p>
        </Reveal>
      </section>

      {/* Features · dark */}
      <section id="features" className="section section-deco dark-section" style={{ background: "var(--navy-700)" }}>
        <Deco kind="lines" />
        <Reveal className="page">
          <SectionHead light eyebrow="Our features" title="Everything you need to stop disputes early" />
          <div className="grid-4">
            {FEATURES.map((f) => (
              <Link key={f.title} to={`/features/${f.id}${f.anchor ? "#" + f.anchor : ""}`} className="card clickable lift" style={{ height: "100%" }}>
                <span className="icon-bubble lg"><f.icon size={26} /></span>
                <h3 className="h3">{f.title}</h3>
                <p className="text-2 grow">{f.text}</p>
                <span className="row gap-8 small body-strong more" style={{ color: "var(--navy-700)" }}>Learn more <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* How it works · light */}
      <section id="how" className="section section-deco how-section">
        <Deco kind="waves" />
        <Reveal className="page">
          <SectionHead eyebrow="How it works" title="Three steps, no formal dispute" />
          <div className="grid-3">
            {STEPS.map(([Icon, t, d], i) => (
              <Card key={t} className="step-card lift" style={{ height: "100%" }}>
                <div className="row between">
                  <span className="icon-bubble"><Icon size={20} /></span>
                  <span className="step-num">{i + 1}</span>
                </div>
                <h3 className="h3">{t}</h3>
                <p className="text-2">{d}</p>
              </Card>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Who it's for · dark (hero buttons scroll here) */}
      <section id="who" className="section section-deco dark-section" style={{ background: "var(--navy-900)" }}>
        <Deco kind="waves" tone="dark" />
        <Reveal className="page">
          <SectionHead light eyebrow="Who it's for" title="Pick what fits you" />
          <div className="grid-2">
            <PhotoCard img={agate} warm icon={Store} title="I run an online store"
              text="Answer buyers instantly, prevent disputes and win the ones that still happen."
              actions={<><Button to="/signup/business">Create a business account</Button><Button kind="ghost" to="/merchant">See the merchant demo</Button></>} />
            <PhotoCard img={agate} icon={ShieldCheck} title="I got a suspicious message or charge"
              text="Check it in a minute. We never ask for your password or codes."
              actions={<><Button to="/scam-check">Start a Scam Check</Button><Button kind="ghost" to="/store">Try Order Help as a buyer</Button></>} />
          </div>
        </Reveal>
      </section>

      {/* Contact · light */}
      <section id="contact" className="section section-deco" style={{ background: "var(--white)" }}>
        <Deco kind="blobs" />
        <Reveal className="page row between wrap gap-24">
          <div className="stack gap-8">
            <span className="caption accent-text">Contact us</span>
            <h2 className="h1">Questions? We'd love to hear from you.</h2>
          </div>
          <a className="btn primary" href={`mailto:${SUPPORT_EMAIL}`}><Mail size={18} />{SUPPORT_EMAIL}</a>
        </Reveal>
      </section>
    </>
  );
}
