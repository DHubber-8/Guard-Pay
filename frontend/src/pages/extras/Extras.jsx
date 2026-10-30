// 33 Email templates · 34 Common states · plus a "/screens" index of every screen
import { Link } from "react-router-dom";
import { CircleCheck, TriangleAlert, Search, Store } from "lucide-react";
import { Button, Card, Skeleton, Logo } from "../../components/ui";
import { photo, BG } from "../../layouts/layouts";

const EMAILS = [
  ["Buyer", "Your order #1032 has shipped", "Hi Ahmed, your mugs are on the way! Track them any time. If anything goes wrong, our Order Help page can usually sort it in minutes.", "Track or get help", "Order Help doesn't affect your PayPal Buyer Protection."],
  ["Buyer", "Update: your parcel is at customs", "Hi Ahmed, your parcel is held at customs in Singapore. This is normal and it should be released in about 2 days. No action needed.", "See tracking", "Sent automatically by Diana Richella."],
  ["Buyer", "Diana Richella made you an offer", "Hi Rita, the seller has offered a $14.00 partial refund for order #1040. The offer is open for 2 days.", "View offer", "You can decline and still go to PayPal."],
  ["Merchant", "Action needed: 1 request to approve", "Rita P. reported a damaged item on #1040. AI suggests a $14.00 partial refund for you to review. Reply due in 18 hours.", "Review in Inbox", "Nothing is refunded without your approval."],
];

function Page({ title, children }) {
  return (
    <div className="bg-soft app-bg photo-bg" style={photo(BG.setup).style}><div className="page stack gap-32">
      <div className="row between"><Logo /><Link to="/screens" className="small body-strong">All screens</Link></div>
      <h1 className="h1">{title}</h1>
      {children}
    </div></div>
  );
}

export function Emails() {
  return (
    <Page title="Email templates">
      <div className="grid-4" style={{ alignItems: "start" }}>
        {EMAILS.map(([to, subj, body, cta, foot]) => (
          <Card key={subj} className="flush">
            <div className="stack gap-4" style={{ padding: "14px 20px", background: "var(--cream-200)" }}>
              <span className="small muted">To: {to}</span><span className="body-strong">{subj}</span>
            </div>
            <div className="stack gap-16" style={{ padding: 24 }}>
              <div className="row gap-8"><span className="avatar" style={{ width: 28, height: 28 }}><Store size={14} /></span><span className="body-strong">Diana Richella</span></div>
              <p className="text-2">{body}</p>
              <Button block>{cta}</Button>
              <span className="small muted">{foot}</span>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}

function State({ title, icon: Icon, head, sub, btn, err }) {
  return (
    <Card style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
      <span className="caption muted">{title}</span>
      <span className={`icon-bubble lg ${err ? "danger" : ""}`} style={{ borderRadius: 99 }}><Icon size={24} /></span>
      <h2 className="h3" style={err ? { color: "var(--danger)" } : undefined}>{head}</h2>
      <p className="text-2">{sub}</p>
      <Button kind={err ? "primary" : "secondary"} size="sm">{btn}</Button>
    </Card>
  );
}

export function States() {
  return (
    <Page title="Common states">
      <div className="grid-4" style={{ alignItems: "start" }}>
        <State title="Empty" icon={CircleCheck} head="All caught up" sub="No requests need your approval right now." btn="View past cases" />
        <Card style={{ padding: 40 }}><span className="caption muted">Loading</span><Skeleton w="90%" /><Skeleton w="70%" /><Skeleton w="85%" /><Skeleton w="50%" /><Skeleton h={110} /></Card>
        <State title="Error" icon={TriangleAlert} head="Couldn't reach PayPal" sub="We'll retry automatically. Your data is safe." btn="Try again" err />
        <State title="Not found" icon={Search} head="We couldn't find that order" sub="Check the order number and email from your receipt." btn="Try again" />
      </div>
    </Page>
  );
}

const SCREENS = [
  ["A · Landing", [["01", "Landing page", "/"], ["01b", "Feature: Order Help", "/features/order-help"], ["01c", "Feature: Scam Check", "/features/scam-check"], ["01d", "Feature: Dispute Helper & Insights", "/features/dispute-helper"]]],
  ["B · Auth", [["02", "Choose account type", "/start"], ["03a", "Sign in", "/signin"], ["03b", "Sign up: Individual", "/signup/individual"], ["03c", "Sign up: Business", "/signup/business"], ["03d", "Forgot password", "/signin?reset=1"]]],
  ["C · Merchant", [["04", "Onboarding 1: Connect PayPal", "/onboarding/1"], ["05", "Onboarding 2: Add Order Help", "/onboarding/2"], ["06", "Onboarding 3: Preferences", "/onboarding/3"], ["07", "Merchant home", "/merchant"], ["08", "Inbox", "/merchant/inbox"], ["09", "Case: Order Help", "/merchant/cases/1051"], ["10", "Case: Formal dispute", "/merchant/disputes/PP-D-27891"], ["11", "Approve confirmation (click Approve on 09)", "/merchant/cases/1051"], ["12", "Risk alert", "/merchant/risk/1066"], ["13", "Shipments", "/merchant/shipments"], ["14", "Insights", "/merchant/insights"], ["15", "Merchant Scam Check", "/merchant/scam-check"], ["16", "Settings", "/merchant/settings"]]],
  ["D · Individual", [["17", "Individual home", "/me"], ["18", "Account", "/me/account"]]],
  ["E · Scam Check", [["19", "Intro", "/scam-check"], ["20", "Describe", "/scam-check/new"], ["21", "Analyzing", "/scam-check/analyzing"], ["22", "AI follow-up", "/scam-check/questions"], ["23", "Result", "/scam-check/result"], ["24", "Your decision", "/scam-check/decision"]]],
  ["F · Order Help", [["25", "Demo store page", "/store"], ["26", "Find your order", "/help/diana-richella"], ["27", "What's the problem?", "/help/diana-richella/problem"], ["28", "Instant answer", "/help/diana-richella/answer"], ["29", "Waiting for the seller", "/help/diana-richella/waiting"], ["30", "Seller's offer", "/help/diana-richella/offer"], ["31", "Resolved", "/help/diana-richella/resolved"], ["32", "Get help from PayPal", "/help/diana-richella/paypal"]]],
  ["G · Extras", [["33", "Email templates", "/extras/emails"], ["34", "Common states", "/extras/states"]]],
];

export function ScreensIndex() {
  return (
    <Page title="All screens">
      <div className="grid-3 screens-index" style={{ alignItems: "start" }}>
        {SCREENS.map(([group, items]) => (
          <Card key={group}>
            <h2 className="h3">{group}</h2>
            <ul className="stack gap-8" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map(([n, label, to]) => (
                <li key={n} className="row gap-12"><span className="caption muted" style={{ width: 32 }}>{n}</span><Link to={to}>{label}</Link></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Page>
  );
}
