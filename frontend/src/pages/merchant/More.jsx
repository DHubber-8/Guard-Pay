// 13 Shipments · 14 Insights · 15 Merchant Scam Check · 16 Settings
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import PaypalBanner from "../../components/PaypalBanner";
import { usePaypalConnected, setPaypalConnected } from "../../session";
import { setRole } from "../../session";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TriangleAlert, ShieldCheck, Wallet, Calendar, ChevronDown, ScanSearch, Store, Copy, Download, Code } from "lucide-react";
import { api } from "../../api";
import { Button, Card, Badge, RiskBadge, Chips, Textarea, Input, Toggle, UploadBox, Skeleton, Notice, useToast } from "../../components/ui";
import { LineChart, BarList } from "../../components/Charts";
import { merchant } from "../../mock/data";

/* ---------- 13 Shipments (Flow 1B) ---------- */
export function Shipments() {
  const { data: list } = useQuery({ queryKey: ["shipments"], queryFn: api.getShipments });
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState("#1032");
  const [sent, setSent] = useState(false);
  const [toast, showToast] = useToast();
  if (!list) return <Skeleton h={400} />;
  const pick = { all: () => true, ontime: (s) => s.status[0] === "low", delayed: (s) => s.status[0] === "high", customs: (s) => s.status[1] === "Held at customs" };
  const rows = list.filter(pick[filter]);
  const s = list.find((x) => x.order === sel);
  const days = Array.from({ length: 15 }, (_, i) => 18 + i); // 18–32 Oct
  const pos = (d) => `${((d - 18) / 14) * 100}%`;
  return (
    <div className="stack gap-24">
      <h1 className="h1">Shipments</h1>
      <Chips value={filter} onChange={setFilter} items={[
        { value: "all", label: `All · ${list.length}` }, { value: "ontime", label: "On time" },
        { value: "delayed", label: "Delayed" }, { value: "customs", label: "At customs" },
      ]} />
      <div className="cols">
        <div className="stack gap-24">
          <Card>
            <h2 className="h3">Timeline</h2>
            <div className="scroll-x"><div className="stack gap-8">
              <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 12 }}>
                <span />
                <div className="row between caption muted">{days.filter((d) => d % 2 === 0).map((d) => <span key={d}>{d}</span>)}</div>
              </div>
              {rows.map((x) => (
                <div key={x.order} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => { setSel(x.order); setSent(false); }}>
                  <span className={`small ${x.order === sel ? "body-strong" : ""}`}>{x.order}</span>
                  <div style={{ position: "relative", height: 26, background: "var(--cream-100)", borderRadius: 8 }}>
                    <div title="Expected window" style={{ position: "absolute", left: pos(x.shipped), width: `calc(${pos(x.expected)} - ${pos(x.shipped)})`, top: 5, bottom: 5, borderRadius: 6,
                      background: x.status[0] === "high" ? "var(--danger-bg)" : x.status[0] === "medium" ? "var(--warn-bg)" : "var(--mist-200)",
                      border: `1.5px solid ${x.status[0] === "high" ? "var(--danger)" : x.status[0] === "medium" ? "var(--warn)" : "var(--steel-500)"}` }} />
                    {x.actual && <div title="Delivered" style={{ position: "absolute", left: pos(x.actual), top: 3, width: 4, bottom: 3, background: "var(--ok)", borderRadius: 2 }} />}
                    <div title="Today" style={{ position: "absolute", left: pos(x.now), top: -4, bottom: -4, width: 2, background: "var(--terracotta-500)" }} />
                  </div>
                </div>
              ))}
              <div className="row gap-16 small muted" style={{ marginTop: 8 }}>
                <span className="row gap-8"><span style={{ width: 12, height: 8, borderRadius: 3, background: "var(--mist-200)", border: "1.5px solid var(--steel-500)" }} />Expected delivery window</span>
                <span className="row gap-8"><span style={{ width: 2, height: 12, background: "var(--terracotta-500)" }} />Today</span>
              </div>
            </div></div>
          </Card>
          <Card className="flush">
            <table className="table">
              <thead><tr><th>Order</th><th>Buyer</th><th>Carrier</th><th>Expected</th><th>Status now</th></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.order} className="clickable" onClick={() => { setSel(x.order); setSent(false); }} style={x.order === sel ? { background: "var(--mist-50)" } : undefined}>
                    <td className="body-strong">{x.order}</td><td>{x.buyer}</td><td>{x.carrier}</td><td>{x.expected} Oct</td>
                    <td><Badge level={x.status[0]}>{x.status[1]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <Card>
          <h2 className="h3">Message to {s.buyer.split(" ")[0]} · {s.order}</h2>
          <p className="small muted row gap-8"><Sparkles size={14} color="var(--gold-500)" />Drafted by AI because the parcel is {s.status[1].toLowerCase()}.</p>
          <Textarea id="ship-msg" key={s.order} label="Message" rows={6} defaultValue={
            s.status[0] === "low"
              ? `Hi ${s.buyer.split(" ")[0]}! Your parcel is on track and should arrive by ${s.expected} Oct. Track it here: ${s.carrier.toLowerCase()}.com/track`
              : `Hi ${s.buyer.split(" ")[0]}! Your parcel is ${s.status[1].toLowerCase()} and we're watching it closely. We'll update you within 2 days. Track it here: ${s.carrier.toLowerCase()}.com/track`} />
          <div className="row gap-12"><Button className="grow" onClick={() => { setSent(true); showToast(`Message sent to ${s.buyer}`); }} disabled={sent}>{sent ? "Sent" : "Send message"}</Button><Button kind="secondary" onClick={() => document.getElementById("ship-msg")?.focus()}>Edit</Button></div>
          <p className="small muted">Simple status updates can be sent automatically (Settings).</p>
        </Card>
      </div>
      {toast}
    </div>
  );
}

/* ---------- 14 Insights ---------- */
export function Insights() {
  const { data: d } = useQuery({ queryKey: ["insights"], queryFn: api.getInsights });
  const { data: s } = useQuery({ queryKey: ["stats"], queryFn: api.getStats });
  if (!d || !s) return <Skeleton h={400} />;
  return (
    <div className="stack gap-24">
      <div className="row between">
        <h1 className="h1">Insights</h1>
        <label className="chip" style={{ gap: 8 }}><Calendar size={16} />
          <select aria-label="Date range" defaultValue="30" style={{ border: 0, background: "transparent", font: "inherit", cursor: "pointer" }}>
            <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <div className="grid-4">
        {[["Disputes prevented", s.disputesPrevented], ["Misunderstandings cleared", s.misunderstandingsCleared], ["Risky orders flagged", s.riskyOrdersFlagged], ["Avg. time to solve", `${s.avgMinutesToSolve} min`]].map(([l, v]) => (
          <Card key={l} className="tight" style={{ padding: 20 }}><span className="caption muted">{l}</span><span className="stat-value">{v}</span></Card>
        ))}
      </div>
      <div className="grid-2">
        <Card>
          <h2 className="h3">Cases per week</h2>
          <LineChart labels={d.weeks} series={[
            { name: "Order Help", values: d.orderHelp, color: "var(--navy-700)" },
            { name: "Formal disputes", values: d.disputes, color: "var(--terracotta-500)" },
            { name: "Scam Checks", values: d.scams, color: "var(--steel-500)" },
          ]} />
          <p className="small muted">More problems are solved in Order Help, so fewer become formal disputes.</p>
        </Card>
        <Card><h2 className="h3">Top reasons</h2><BarList rows={d.reasons} /></Card>
      </div>
      <Card className="flush">
        <div style={{ padding: "20px 24px" }}><h2 className="h3">Most problematic products</h2></div>
        <table className="table">
          <thead><tr><th>Product</th><th>Cases</th><th>Main reason</th><th>Share of orders</th></tr></thead>
          <tbody>{d.products.map((p) => <tr key={p[0]}><td className="body-strong">{p[0]}</td><td>{p[1]}</td><td>{p[2]}</td><td>{p[3]}</td></tr>)}</tbody>
        </table>
      </Card>
      <Notice icon={Sparkles}>AI tip: "Speckled mug" breaks most often in transit. Extra padding could prevent about 6 cases a month.</Notice>
    </div>
  );
}

/** Drawn "screenshot" of the suspicious email the merchant uploaded (demo). */
function EmailShot() {
  const Flag = ({ n }) => <span className="flag" aria-label={`Flag ${n}`}>{n}</span>;
  return (
    <div className="email-shot" role="img" aria-label="Screenshot of a fake payment email">
      <div className="email-bar"><span /><span /><span /><b>Inbox</b></div>
      <div className="email-head">
        <span className="email-avatar">P</span>
        <div className="stack grow">
          <span className="body-strong">PayPaI Service <Flag n={1} /></span>
          <span className="small muted">service@paypa1-payments.com · 09:41</span>
        </div>
      </div>
      <div className="email-body">
        <p className="body-strong">You've received a payment of $500.00 USD</p>
        <p className="small">John Carter sent you <b>$500.00</b>. The funds are on hold until you ship the item and upload a tracking number. <Flag n={2} /></p>
        <span className="email-btn">Release my funds <Flag n={3} /></span>
        <p className="caption muted" style={{ textTransform: "none", letterSpacing: 0 }}>Transaction ID: 8XK29011 · Do not reply to this email</p>
      </div>
    </div>
  );
}

/* ---------- 15 Merchant Scam Check ---------- */
export function MerchantScamCheck() {
  const [checked, setChecked] = useState(true);
  const [status, setStatus] = useState(null);
  const [toast, showToast] = useToast();
  return (
    <div className="stack gap-24">
      <div className="row between wrap gap-12">
        <h1 className="h1">Scam Check</h1>
        <Button kind="secondary" onClick={() => setChecked(false)}><ScanSearch size={18} />New check</Button>
      </div>
      {!checked ? (
        <Card style={{ maxWidth: 720 }}>
          <h2 className="h3">What did you receive?</h2>
          <Textarea label="Paste the message or describe it" placeholder="e.g. An email says I received $500 and must ship today…" />
          <UploadBox title="Add screenshots" hint="Hide passwords and codes before uploading" />
          <Button onClick={() => { setChecked(true); setStatus(null); }} style={{ alignSelf: "flex-start" }}>Check it</Button>
        </Card>
      ) : (
        <div className="cols wide-side">
          <div className="stack gap-24">
            <Card>
              <h2 className="h3">What you sent</h2>
              <p style={{ fontSize: 17 }}>"PayPal: You've received $500.00 from John Carter. Please ship the item now to release the funds."</p>
              <EmailShot />
              <span className="small muted">Uploaded screenshot · the red marks are what the AI flagged</span>
            </Card>
            <div className="notice danger" style={{ padding: 20 }}>
              <TriangleAlert size={20} />
              <div className="stack gap-4"><b>This $500 payment does not exist in your PayPal account</b><span className="small" style={{ color: "var(--text-2)" }}>Checked against your real PayPal transactions</span></div>
            </div>
          </div>
          <Card>
            <div className="row gap-12 wrap"><RiskBadge level="high" /><Badge level="low">Evidence: complete</Badge></div>
            <h2 className="h2">Signs of a fake payment email</h2>
            <span className="label muted">Why</span>
            <ul className="icon-list">{[["1", "Sender name uses a capital I instead of l, and the domain is not paypal.com"], ["2", "Asks you to ship before the money arrives"], ["3", "The button leads to a look-alike site"], ["", "No matching payment in your PayPal account"]].map(([n, t]) => <li key={t}>{n ? <span className="flag">{n}</span> : <TriangleAlert size={18} color="var(--danger)" />}{t}</li>)}</ul>
            <span className="label muted">Safe next steps</span>
            <ul className="icon-list">{["Don't ship the item", "Forward the email to PayPal's phishing team", "Only trust payments you see in your PayPal account"].map((t) => <li key={t}><ShieldCheck size={18} color="var(--ok)" />{t}</li>)}</ul>
            {status ? <Notice icon={ShieldCheck}>{status}</Notice> : (
              <div className="row gap-12 wrap">
                <Button className="grow" onClick={() => { setStatus("Reported. Forward the original email to phishing@paypal.com too."); showToast("Reported to PayPal"); }}>Report to PayPal</Button>
                <Button kind="secondary" onClick={() => { setStatus("Marked as resolved. Saved to your Scam Check history."); showToast("Marked as resolved"); }}>Mark resolved</Button>
              </div>
            )}
          </Card>
        </div>
      )}
      {toast}
    </div>
  );
}

/* ---------- 16 Settings ---------- */
function Row({ title, sub, children }) {
  return (
    <div className="row gap-16 wrap" style={{ justifyContent: "space-between" }}>
      <div className="grow stack gap-4" style={{ minWidth: 220 }}><span className="body-strong">{title}</span>{sub && <span className="small muted">{sub}</span>}</div>
      {children}
    </div>
  );
}

const TONE_PREVIEW = {
  Friendly: "Hi Sam! Good news: your parcel is just waiting at customs in Singapore. It should be on its way again in about 2 days. Here's the tracking link so you can follow it.",
  Formal: "Dear Sam, your parcel is currently held by customs in Singapore. It is expected to be released within approximately 2 days. Please find the tracking link below.",
};
const ORDER_HELP_URL = "https://help.yourproduct.com/diana-richella";
const WIDGET_CODE = '<script src="https://help.yourproduct.com/widget.js" data-store="diana-richella"></script>';

function QrCode({ text }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: 240, color: { dark: "#14232e", light: "#ffffff" } }).then(setSrc); }, [text]);
  return src ? <img src={src} alt="QR code for your Order Help page" width="120" height="120" style={{ borderRadius: 8, border: "1px solid var(--line)" }} /> : <Skeleton h={120} w={120} />;
}

export function Settings() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "paypal" ? "PayPal connection" : "Store profile");
  const [auto, setAuto] = useState(true);
  const connected = usePaypalConnected();
  const [logo, setLogo] = useState(null);
  const [limit, setLimit] = useState(20);
  const [tone, setTone] = useState("Friendly");
  const [review, setReview] = useState(false);
  const [ch, setCh] = useState({ email: true, link: true });
  const [notif, setNotif] = useState({ instant: true, summary: "Weekly", email: true });
  const [toast, showToast] = useToast();
  const tabs = ["Store profile", "PayPal connection", "Order Help channels", "Preferences", "Notifications"];
  const copy = (text, what) => { navigator.clipboard?.writeText(text); showToast(`${what} copied`); };
  const downloadQr = async () => {
    const url = await QRCode.toDataURL(ORDER_HELP_URL, { margin: 2, width: 1024 });
    const a = document.createElement("a"); a.href = url; a.download = "order-help-qr.png"; a.click();
  };

  const panels = {
    "Store profile": (
      <Card>
        <h2 className="h3">Store profile</h2>
        <div className="row gap-16 wrap">
          <span className="avatar" style={{ width: 72, height: 72, fontSize: 22, overflow: "hidden" }}>{logo ? <img src={logo} alt="Store logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Store size={28} />}</span>
          <div className="grow stack gap-4"><span className="body-strong">Store logo</span><span className="small muted">Shown on your Order Help page and emails</span></div>
          <label className="btn secondary sm">Upload<input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && setLogo(URL.createObjectURL(e.target.files[0]))} /></label>
        </div>
        <div className="grid-2"><Input label="Store name" defaultValue={merchant.name} /><Input label="Website" defaultValue={merchant.website} /></div>
        <Input label="Support email" defaultValue={merchant.email} />
      </Card>
    ),
    "PayPal connection": (
      <>
        <PaypalBanner inSettings />
        <Card>
          <h2 className="h3">PayPal connection</h2>
          <div className="row gap-16 wrap">
            <span className="icon-bubble lg"><Wallet size={24} /></span>
            <div className="grow stack"><span className="body-strong">PayPal business account</span><span className="small muted">{connected ? merchant.paypalEmail : "Not connected"}</span></div>
            {connected ? <Badge level="low">Connected</Badge> : <Badge level="neutral">Not connected</Badge>}
            <Button kind="secondary" size="sm" onClick={() => { setPaypalConnected(!connected); showToast(connected ? "PayPal disconnected" : "PayPal connected"); }}>{connected ? "Disconnect" : "Connect"}</Button>
          </div>
          <Notice>We can read payments, disputes and tracking. Refunds and evidence are only sent after you approve.</Notice>
        </Card>
      </>
    ),
    "Order Help channels": (
      <Card>
        <h2 className="h3">Order Help channels</h2>
        <p className="small muted">These are the ways buyers reach your Order Help page. Only the email is fully automatic; the link, QR code and widget are things you place in your store yourself.</p>
        <div className="channel">
          <Row title="Automatic email to buyers" sub="Automatic: after every PayPal payment we email the buyer your Order Help link, in your store's name.">
            <Toggle on={ch.email} onChange={(v) => { setCh({ ...ch, email: v }); showToast(v ? "Emails turned on" : "Emails turned off"); }} label="Automatic email" />
          </Row>
        </div>
        <div className="channel">
          <Row title="Order Help link" sub="Paste it in your Instagram bio, WhatsApp auto-reply or Contact page. Turning it off makes the link show “not available”.">
            <Toggle on={ch.link} onChange={(v) => setCh({ ...ch, link: v })} label="Link active" />
          </Row>
          <div className="row gap-8"><input className="input" readOnly value={ORDER_HELP_URL} style={{ height: 40 }} disabled={!ch.link} /><Button size="sm" kind="secondary" disabled={!ch.link} onClick={() => copy(ORDER_HELP_URL, "Link")}><Copy size={16} />Copy</Button></div>
        </div>
        <div className="channel">
          <Row title="QR code" sub="Print it on invoices, package inserts or your shop counter. It opens the same Order Help link.">
            <Button size="sm" kind="secondary" disabled={!ch.link} onClick={downloadQr}><Download size={16} />Download PNG</Button>
          </Row>
          <QrCode text={ORDER_HELP_URL} />
        </div>
        <div className="channel">
          <Row title="Website widget (for developers)" sub="Paste this line before </body> on your website to show the “Problem with an order?” button.">
            <Button size="sm" kind="secondary" onClick={() => copy(WIDGET_CODE, "Code")}><Code size={16} />Copy code</Button>
          </Row>
          <code className="codebox">{WIDGET_CODE}</code>
        </div>
      </Card>
    ),
    Preferences: (
      <Card>
        <h2 className="h3">Preferences</h2>
        <Row title={`Auto-approve refunds under $${limit}`} sub="Frequent refund requesters always need your manual approval.">
          <input type="range" min="0" max="100" step="5" value={limit} onChange={(e) => setLimit(+e.target.value)} style={{ accentColor: "var(--navy-700)", width: 200 }} />
        </Row>
        <div className="stack gap-12">
          <Row title="Message tone" sub="How the AI writes to your buyers.">
            <div className="chips">{["Friendly", "Formal"].map((t) => <button key={t} className={`chip ${tone === t ? "on" : ""}`} onClick={() => setTone(t)}>{t}</button>)}</div>
          </Row>
          <div className="tone-preview" key={tone}>
            <span className="caption muted">Preview · {tone}</span>
            <p>{TONE_PREVIEW[tone]}</p>
          </div>
        </div>
        <Row title="Review AI explanations before sending" sub={review ? "On: you check each one first." : "Off: misunderstandings are answered instantly."}><Toggle on={review} onChange={setReview} label="Review AI explanations" /></Row>
        <Row title="Send simple delivery updates automatically" sub="Delays and customs holds. Anything with money still needs your approval."><Toggle on={auto} onChange={setAuto} label="Automatic updates" /></Row>
      </Card>
    ),
    Notifications: (
      <Card>
        <h2 className="h3">Notifications</h2>
        <Row title="Instant alerts" sub="New disputes, risk alerts and requests waiting for you"><Toggle on={notif.instant} onChange={(v) => setNotif({ ...notif, instant: v })} label="Instant alerts" /></Row>
        <div className="stack gap-8">
          <Row title="Summary email" sub={notif.summary === "Off" ? "No summary emails." : `One email ${{ Daily: "every morning", Weekly: "every Monday", Monthly: "on the 1st of each month", Yearly: "every January" }[notif.summary]} with cases, trends and what was solved.`} />
          <div className="chips">{["Off", "Daily", "Weekly", "Monthly", "Yearly"].map((f) => <button key={f} className={`chip ${notif.summary === f ? "on" : ""}`} onClick={() => setNotif({ ...notif, summary: f })}>{f}</button>)}</div>
        </div>
        <Row title="Email me about deadlines" sub="24 hours before a PayPal deadline"><Toggle on={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} label="Deadline emails" /></Row>
      </Card>
    ),
  };

  return (
    <div className="stack gap-24">
      <h1 className="h1">Settings</h1>
      <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0,1fr)", gap: 24, alignItems: "start" }} className="settings-grid">
        <Card className="tight settings-menu" style={{ padding: 8, gap: 2 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`navlink ${tab === t ? "active" : ""}`} style={{ border: 0, textAlign: "left", width: "100%", borderRadius: 10, cursor: "pointer", background: tab === t ? undefined : "transparent" }}>{t}</button>
          ))}
          <hr className="divider" style={{ margin: "6px 0" }} />
          <Link to="/" onClick={() => setRole(null)} className="navlink" style={{ color: "var(--danger)" }}>Log out</Link>
        </Card>
        <div key={tab} className="stack gap-24 route-anim">
          {panels[tab]}
          <div className="row end"><Button onClick={() => showToast("Settings saved")}>Save changes</Button></div>
        </div>
      </div>
      <style>{`@media (max-width: 900px){ .settings-grid{grid-template-columns:minmax(0,1fr) !important} .settings-menu{flex-direction:row !important; overflow-x:auto} .settings-menu .navlink{flex:none; width:auto !important} .settings-menu hr{display:none} }`}</style>
      {toast}
    </div>
  );
}
