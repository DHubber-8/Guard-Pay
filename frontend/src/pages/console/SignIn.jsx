// Staff sign-in. In production this is PayPal's staff single sign-on; the demo
// signs in as a sample specialist. We never ask for a password here.
import { useNavigate } from "react-router-dom";
import { ShieldCheck, KeyRound } from "lucide-react";
import { Button, Card, Notice } from "../../components/ui";
import { BRAND_NAME } from "../../config";
import { signIn } from "../../session";

export default function SignIn() {
  const nav = useNavigate();
  const go = () => { signIn(); nav("/", { replace: true }); };
  return (
    <div className="signin">
      <Card className="signin-card">
        <div className="side-brand" style={{ color: "var(--navy-900)", padding: 0 }}>
          <img src="/favicon.svg" alt="" />
          <div><b>{BRAND_NAME}</b><small style={{ color: "var(--muted)" }}>PayPal Resolution Console</small></div>
        </div>
        <div className="stack gap-8">
          <h1 className="h2">Sign in to review disputes</h1>
          <p className="text-2">For PayPal resolution and risk staff. Use your PayPal staff account.</p>
        </div>
        <Button block className="sso-btn" onClick={go}><KeyRound size={18} />Continue with PayPal staff SSO</Button>
        <div className="divider-text">Demo</div>
        <Button block kind="secondary" onClick={go}>Sign in as Diana R. · Resolution specialist</Button>
        <Notice icon={ShieldCheck}>The AI only recommends. Every refund, ruling or account action needs a staff decision, and every decision is logged.</Notice>
      </Card>
    </div>
  );
}
