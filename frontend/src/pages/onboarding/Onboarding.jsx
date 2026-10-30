// 04–06 Merchant setup (Flow 0): /onboarding/1, /2, /3
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Mail, Link as LinkIcon, QrCode, Code, Copy, Wallet, Info } from "lucide-react";
import { Backdrop } from "../../components/Art";
import { Logo, Button, Card, Badge, Toggle, Notice, IconList } from "../../components/ui";

function Shell({ step, children, onNext, nextLabel = "Continue", back }) {
  const nav = useNavigate();
  return (
    <div className="bg-soft app-bg has-backdrop">
      <Backdrop kind="dunes" />
      <header className="topnav"><div className="topnav-inner"><Logo /><span className="small muted" style={{ marginLeft: "auto" }}>Step {step} of 3</span></div></header>
      <div className="onboard-panel stack gap-24">
        <div className="row gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ height: 6, flex: 1, borderRadius: 99, background: n <= step ? "var(--navy-700)" : "var(--cream-200)" }} />
          ))}
        </div>
        {children}
        <div className="row between">
          {back ? <Button kind="ghost" onClick={() => nav(back)}>Back</Button> : <span />}
          <Button onClick={onNext}>{nextLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function ConnectPayPal() {
  const nav = useNavigate();
  const [connected, setConnected] = useState(false);
  return (
    <Shell step={1} onNext={() => nav("/onboarding/2")} nextLabel={connected ? "Continue" : "Skip for now"}>
      <div className="stack gap-8">
        <span className="caption muted">Step 1 of 3</span>
        <h1 className="h1">Connect your PayPal account</h1>
        <p className="text-2">We use it to see payments, disputes and tracking for your store.</p>
      </div>
      <Card>
        <IconList icon={Check} color="var(--ok)" items={["Read payments and orders", "Read disputes and tracking", "Send refunds and evidence, only after you approve"]} />
        <hr className="divider" />
        <div className="row gap-16">
          <span className="icon-bubble lg"><Wallet size={24} /></span>
          <div className="grow stack"><span className="body-strong">PayPal business account</span><span className="small muted">{connected ? "diana@dianarichella.com" : "Not connected"}</span></div>
          {connected ? <Badge level="low">Connected</Badge> : <Button onClick={() => setConnected(true)}>Connect PayPal</Button>}
        </div>
      </Card>
    </Shell>
  );
}

const CHANNELS = [
  { id: "email", icon: Mail, title: "Automatic email to buyers", text: "After every payment we email the buyer an Order Help link in your store's name.", tag: "Zero effort" },
  { id: "link", icon: LinkIcon, title: "Copy link", text: "Paste it in your Instagram bio, WhatsApp auto-reply or Contact page." },
  { id: "qr", icon: QrCode, title: "QR code", text: "Print it on invoices or package inserts." },
  { id: "dev", icon: Code, title: "For developers (Advanced)", text: "Add a one-line widget to your website's HTML." },
];

function AddToStore() {
  const nav = useNavigate();
  const [on, setOn] = useState({ email: true, link: true, qr: false, dev: false });
  return (
    <Shell step={2} back="/onboarding/1" onNext={() => nav("/onboarding/3")}>
      <div className="stack gap-8">
        <span className="caption muted">Step 2 of 3</span>
        <h1 className="h1">Add Order Help to your store</h1>
        <p className="text-2">Pick one or more ways for buyers to reach Order Help. No coding needed for the first three.</p>
      </div>
      <div className="stack gap-12">
        {CHANNELS.map((c) => (
          <Card key={c.id} className={`tight clickable ${on[c.id] ? "selected" : ""}`} onClick={() => setOn({ ...on, [c.id]: !on[c.id] })}>
            <div className="row gap-16" style={{ alignItems: "flex-start" }}>
              <span className="icon-bubble"><c.icon size={20} /></span>
              <div className="grow stack gap-4">
                <span className="row gap-8 body-strong">{c.title}{c.tag && <Badge level="warm">{c.tag}</Badge>}</span>
                <span className="small muted">{c.text}</span>
                {on[c.id] && c.id === "link" && (
                  <div className="row gap-8" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                    <input className="input" readOnly value="help.yourproduct.com/diana-richella" style={{ height: 40 }} />
                    <Button size="sm" kind="secondary" onClick={() => navigator.clipboard?.writeText("help.yourproduct.com/diana-richella")}><Copy size={16} />Copy</Button>
                  </div>
                )}
                {on[c.id] && c.id === "dev" && (
                  <code className="small" style={{ background: "var(--navy-900)", color: "#e6eef2", padding: 12, borderRadius: 8, marginTop: 8, display: "block" }}>
                    {'<script src="https://help.yourproduct.com/widget.js" data-store="diana-richella"></script>'}
                  </code>
                )}
              </div>
              <input type="checkbox" checked={on[c.id]} readOnly style={{ width: 20, height: 20, accentColor: "var(--navy-700)" }} />
            </div>
          </Card>
        ))}
      </div>
      <Notice icon={Info}>Tip: send your order number to PayPal as <b>invoice_id</b> at checkout, so we can match buyers to their orders.</Notice>
    </Shell>
  );
}

function Preferences() {
  const nav = useNavigate();
  const [limit, setLimit] = useState(20);
  const [tone, setTone] = useState("Friendly");
  const [review, setReview] = useState(false);
  const [notif, setNotif] = useState("Instant alerts");
  const preview = tone === "Friendly"
    ? "Hi Sam! Your parcel is at customs in Singapore and should be released in about 2 days. Here's the tracking link."
    : "Dear Sam, your parcel is currently held at customs in Singapore. It is expected to be released within 2 days. Please find the tracking link below.";
  return (
    <Shell step={3} back="/onboarding/2" onNext={() => nav("/merchant")} nextLabel="Finish setup">
      <div className="stack gap-8">
        <span className="caption muted">Step 3 of 3</span>
        <h1 className="h1">Set your preferences</h1>
        <p className="text-2">You can change these any time in Settings.</p>
      </div>
      <Card>
        <div className="row between"><span className="body-strong">Auto-approve small refunds</span><span className="h3">Under ${limit}</span></div>
        <input type="range" min="0" max="100" step="5" value={limit} onChange={(e) => setLimit(+e.target.value)} style={{ accentColor: "var(--navy-700)" }} />
        <p className="small muted">Frequent refund requesters always need your manual approval.</p>
      </Card>
      <Card>
        <span className="body-strong">Message tone</span>
        <div className="chips">{["Friendly", "Formal"].map((t) => <button key={t} className={`chip ${tone === t ? "on" : ""}`} onClick={() => setTone(t)}>{t}</button>)}</div>
        <div className="card soft tight"><span className="caption muted">Preview</span><p>{preview}</p></div>
      </Card>
      <Card>
        <div className="row gap-16">
          <div className="grow stack gap-4"><span className="body-strong">Review AI explanations before sending</span><span className="small muted">{review ? "On: you check each explanation first." : "Off: misunderstandings are answered instantly."}</span></div>
          <Toggle on={review} onChange={setReview} label="Review AI explanations" />
        </div>
      </Card>
      <Card>
        <span className="body-strong">Notifications</span>
        <div className="chips">{["Instant alerts", "Daily summary"].map((t) => <button key={t} className={`chip ${notif === t ? "on" : ""}`} onClick={() => setNotif(t)}>{t}</button>)}</div>
      </Card>
    </Shell>
  );
}

export default function Onboarding() {
  const { step } = useParams();
  if (step === "2") return <AddToStore />;
  if (step === "3") return <Preferences />;
  return <ConnectPayPal />;
}
