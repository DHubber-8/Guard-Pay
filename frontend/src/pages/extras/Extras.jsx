// Common states, plus a "/screens" index of every screen (testing helper)
import { Link } from "react-router-dom";
import { CircleCheck, TriangleAlert, Search } from "lucide-react";
import { Button, Card, Skeleton, Logo } from "../../components/ui";

function Page({ title, children }) {
  return (
    <div className="app-bg"><div className="page stack gap-32">
      <div className="row between"><Logo /><Link to="/screens" className="small body-strong">All screens</Link></div>
      <h1 className="h1">{title}</h1>
      {children}
    </div></div>
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
        <State title="Empty" icon={CircleCheck} head="Queue is clear" sub="No disputes are waiting for you right now." btn="View resolved cases" />
        <Card style={{ padding: 40 }}><span className="caption muted">Loading</span><Skeleton w="90%" /><Skeleton w="70%" /><Skeleton w="85%" /><Skeleton w="50%" /><Skeleton h={110} /></Card>
        <State title="Error" icon={TriangleAlert} head="Couldn't reach PayPal" sub="We'll retry automatically. Nothing was changed." btn="Try again" err />
        <State title="Not found" icon={Search} head="No account or transaction found" sub="Check the email or transaction ID and try again." btn="Try again" />
      </div>
    </Page>
  );
}

export const SCREENS = [
  ["Extras", [["S2", "Common states", "/extras/states"]]],
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
