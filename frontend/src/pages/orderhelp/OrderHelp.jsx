// 25 Demo store page · 26–32 Order Help for buyers (no login needed)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CircleHelp, Check, Package, Clock, CircleCheck, Sparkles, ShoppingBag, MessageSquare } from "lucide-react";
import { OrderHelp } from "../../layouts/layouts";
import { Button, Card, Badge, Input, Textarea, Notice, RadioCard, KV, IconList, PhotoPicker } from "../../components/ui";
import { buyerOrder as o } from "../../mock/data";
import wave from "../../assets/art/wave.webp";

/* ---------- 25 Demo store with the Order help widget ---------- */
export function DemoStore() {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ background: "white", minHeight: "100vh" }}>
      <div className="row between small" style={{ background: "var(--navy-900)", color: "#d6e0e6", padding: "8px var(--gutter)" }}>
        <Link to="/" className="row gap-8"><ArrowLeft size={14} />Back to Dispute Helper</Link>
        <span>Demo store · not a real shop</span>
      </div>
      <header style={{ borderBottom: "1px solid #e8e8e8" }}>
        <div className="row between" style={{ maxWidth: 1344, margin: "0 auto", padding: "20px var(--gutter)" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Diana Richella</span>
          <nav className="row gap-32 small">
            <a>Shop</a><a>About</a><Link to="/help/diana-richella" className="body-strong">Order help</Link><a className="row gap-8"><ShoppingBag size={16} />Cart (0)</a>
          </nav>
        </div>
      </header>
      <main className="grid-2" style={{ maxWidth: 1344, margin: "0 auto", padding: "48px var(--gutter)", gap: 48 }}>
        <div className="art" style={{ height: 560, borderRadius: 8 }}><img src={wave} alt="Product photo placeholder" /></div>
        <div className="stack gap-16">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 40, fontWeight: 400 }}>Speckled mug</h1>
          <p className="h3">$28.00</p>
          <p className="text-2">Hand-thrown stoneware, 350 ml. Ships worldwide in 5–10 days.</p>
          <button className="btn block" style={{ background: "#222", color: "white", borderRadius: 4 }}>Add to cart</button>
          <button className="btn block" style={{ background: "#ffc439", color: "#003087", borderRadius: 4, fontWeight: 700 }}>PayPal</button>
          <p className="small muted">This is a pretend store for the demo. The button at the bottom right is our widget.</p>
        </div>
      </main>
      <div style={{ position: "fixed", right: 32, bottom: 32, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {hover && <div className="small" style={{ background: "var(--peach-50)", border: "1px solid var(--peach-200)", padding: "8px 12px", borderRadius: 8 }}>Our widget, added with 1 line of code</div>}
        <Link to="/help/diana-richella" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="btn primary" style={{ boxShadow: "var(--shadow-lg)", height: 56 }}>
          <CircleHelp size={20} />Problem with an order?
        </Link>
      </div>
    </div>
  );
}

/* ---------- 26 ---------- */
export function FindOrder() {
  const nav = useNavigate();
  return (
    <OrderHelp step="1/3" footer={<Button block onClick={() => nav("/help/diana-richella/problem")}>Find my order</Button>}>
      <h1 className="h2">Let's find your order</h1>
      <p className="text-2">No account needed. Use the details from your order email.</p>
      <Input label="Order number" placeholder="#1032" defaultValue="#1032" />
      <Input label="Email used at checkout" type="email" placeholder="you@email.com" defaultValue="ahmed.k@mail.com" />
      <Notice>Using Order Help doesn't affect your PayPal Buyer Protection. You can still go to PayPal any time.</Notice>
    </OrderHelp>
  );
}

/* ---------- 27 ---------- */
const REASONS = ["It hasn't arrived", "It arrived damaged", "It's not what I ordered", "I want to cancel or return", "Something else"];
// Why it hasn't arrived. PayPal only has one generic "not received" reason,
// so we ask, then check the answer against the tracking data.
const NOT_ARRIVED = [
  ["delivered", "Tracking says delivered, but I can't find it", "We'll check the signature and delivery photo"],
  ["stuck", "Tracking hasn't moved for days", "We'll check where it last scanned"],
  ["customs", "It's stuck at customs", "We'll check the customs status"],
  ["late", "It's just later than expected", "We'll check the new delivery date"],
  ["address", "I think the address is wrong", "The seller can fix it before delivery"],
  ["notracking", "I don't have any tracking", "We'll look up the tracking for you"],
];

export function Problem() {
  const nav = useNavigate();
  const [r, setR] = useState(REASONS[0]);
  const [why, setWhy] = useState("customs");
  // Questions the tracking data can answer get an instant answer; the rest go to the seller
  const instant = r === REASONS[0] && ["customs", "late", "stuck", "notracking"].includes(why);
  const next = instant ? "/help/diana-richella/answer" : "/help/diana-richella/waiting";
  return (
    <OrderHelp step="2/3" footer={<Button block onClick={() => nav(next)}>Continue</Button>}>
      <Card className="tight" style={{ flexDirection: "row", alignItems: "center" }}>
        <span className="icon-bubble"><Package size={20} /></span>
        <div className="grow stack"><span className="body-strong">{o.item} · {o.order}</span><span className="small muted">Paid {o.paid} · Shipped with {o.carrier}</span></div>
      </Card>
      <h1 className="h2">What's the problem?</h1>
      {REASONS.map((x) => <RadioCard key={x} selected={r === x} onClick={() => setR(x)} title={x} />)}
      {r === REASONS[0] && (
        <Card className="tight soft followup">
          <span className="body-strong">What does it look like on your side?</span>
          {NOT_ARRIVED.map(([id, t, sub]) => (
            <RadioCard key={id} selected={why === id} onClick={() => setWhy(id)} title={t} sub={sub} />
          ))}
        </Card>
      )}
      <Textarea label="Tell us more (optional)" placeholder="Tracking says delivered but…" rows={3} />
      <PhotoPicker />
    </OrderHelp>
  );
}

/* ---------- 28 ---------- */
export function InstantAnswer() {
  const nav = useNavigate();
  return (
    <OrderHelp step="3/3" footer={<>
      <span className="body-strong">Did this solve it?</span>
      <Button block onClick={() => nav("/help/diana-richella/resolved?type=answer")}>Yes, problem solved</Button>
      <Button block kind="secondary" onClick={() => nav("/help/diana-richella/waiting")}>No, still a problem</Button>
    </>}>
      <Badge level="info"><Sparkles size={12} />Answered instantly</Badge>
      <h1 className="h2">Good news: your parcel is on its way</h1>
      <p className="text-2">It's held at customs in Singapore, which is normal for international orders. It should be released in about 2 days.</p>
      <Card>
        <span className="label muted">{o.carrier} · {o.tracking}</span>
        {o.tracking_steps.map((s) => (
          <div key={s.label} className="row gap-12">
            {s.done ? <CircleCheck size={20} color="var(--ok)" /> : <Package size={20} color="var(--muted)" />}
            <span className={`grow ${s.done ? "" : "muted"}`}>{s.label}</span>
            <span className="small muted">{s.date}</span>
          </div>
        ))}
      </Card>
    </OrderHelp>
  );
}

/* ---------- 29 ---------- */
export function Waiting() {
  return (
    <OrderHelp footer={<Button block kind="secondary" to="/help/diana-richella/offer">See the seller's reply</Button>}>
      <div style={{ display: "grid", placeItems: "center", padding: "16px 0" }}><span className="icon-bubble lg" style={{ width: 88, height: 88, borderRadius: 28 }}><Clock size={40} /></span></div>
      <h1 className="h2 center">We've sent your request to Diana Richella</h1>
      <p className="text-2 center">The seller usually replies within 24 hours. We'll email you at a***@mail.com.</p>
      <Card>
        {[["Request received", true], ["Seller reviewing", false], ["Offer or answer", false]].map(([l, d]) => (
          <div key={l} className="row gap-12">{d ? <CircleCheck size={20} color="var(--ok)" /> : <span style={{ width: 20, height: 20, borderRadius: 99, border: "2px solid var(--line-strong)" }} />}<span className={d ? "" : "muted"}>{l}</span></div>
        ))}
      </Card>
      <p className="small muted center">Reply due by 30 Oct, 3:00 PM</p>
      <Notice>If the seller doesn't reply in time, we'll show you how to get help from PayPal.</Notice>
    </OrderHelp>
  );
}

/* ---------- 30 ---------- */
export function Offer() {
  const nav = useNavigate();
  const [msg, setMsg] = useState(false);
  const [sentMsg, setSentMsg] = useState(false);
  return (
    <OrderHelp footer={<>
      <Button block onClick={() => nav("/help/diana-richella/resolved")}>Accept offer</Button>
      <Button block kind="secondary" onClick={() => nav("/help/diana-richella/paypal")}>Decline</Button>
      <Button block kind="ghost" onClick={() => setMsg(!msg)}><MessageSquare size={16} />Message the seller</Button>
      <p className="small muted center">Declining won't affect your rights. You can still go to PayPal.</p>
    </>}>
      <h1 className="h2">Diana Richella made you an offer</h1>
      <Card>
        <span className="caption muted">Partial refund</span>
        <span className="display" style={{ color: "var(--navy-700)" }}>$14.00</span>
        <p className="text-2">For 1 mug that arrived chipped. You keep both mugs.</p>
        <p className="small muted">Refunded to your PayPal within 1–3 days.</p>
      </Card>
      <Card className="warm tight">
        <span className="caption muted">Message from the seller</span>
        <p>"So sorry about the chip! Here's half back."</p>
      </Card>
      {msg && !sentMsg && (
        <Card className="tight">
          <Textarea label="Your message to Diana Richella" rows={3} placeholder="Could you send a replacement instead?" />
          <Button kind="secondary" block onClick={() => setSentMsg(true)}>Send</Button>
        </Card>
      )}
      {sentMsg && <Notice>Message sent. The seller usually replies within 24 hours.</Notice>}
    </OrderHelp>
  );
}

/* ---------- 31 ---------- */
export function Resolved() {
  const answer = new URLSearchParams(location.search).get("type") === "answer";
  return (
    <OrderHelp footer={<Button block kind="secondary" to="/store">Back to the store</Button>}>
      <div style={{ display: "grid", placeItems: "center", padding: "16px 0" }}><span className="icon-bubble ok lg" style={{ width: 88, height: 88, borderRadius: 99 }}><Check size={44} /></span></div>
      <h1 className="h1 center">All sorted!</h1>
      <p className="text-2 center">{answer ? "Glad we could help. Your parcel should arrive in about 2 days." : "Your $14.00 refund is on its way to your PayPal account."}</p>
      <Card><KV rows={[["Order", o.order], ["Outcome", answer ? "Explained with tracking" : "Partial refund $14.00"], ["Date", "27 Oct 2026"]]} /></Card>
      <p className="small muted center">A copy of this {answer ? "summary" : "agreement"} was sent to your email.</p>
    </OrderHelp>
  );
}

/* ---------- 32 ---------- */
export function PayPalGuide() {
  return (
    <OrderHelp footer={<Button block onClick={() => window.open("https://www.paypal.com/resolutioncenter", "_blank")}>Open PayPal Resolution Center</Button>}>
      <h1 className="h2">Get help from PayPal</h1>
      <p className="text-2">You can open a case with PayPal at any time. Using Order Help doesn't affect your rights.</p>
      <Card><span className="body-strong">I have a PayPal account</span><IconList icon={Check} items={["Log in to PayPal", "Go to Resolution Center", `Report a problem with order ${o.order}`]} /></Card>
      <Card><span className="body-strong">I paid as a guest (card)</span><IconList icon={Check} items={["Use PayPal's guest dispute form", "Have your order number and email ready"]} /></Card>
      <Notice icon={CircleHelp}>Tip: share the summary from Order Help, it helps PayPal decide faster.</Notice>
    </OrderHelp>
  );
}
