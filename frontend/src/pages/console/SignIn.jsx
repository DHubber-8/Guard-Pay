import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, KeyRound } from "lucide-react";
import { Button, Card, Notice, Input } from "../../components/ui";
import { BRAND_NAME } from "../../config";
import { login, signup, useStaff } from "../../session";

export default function SignIn() {
  const nav = useNavigate();
  const staff = useStaff();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (staff === undefined) return null;
  if (staff) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (creating) await signup(form.email, form.name, form.password);
      else await login(form.email, form.password);
      nav("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signin">
      <Card className="signin-card">
        <div className="side-brand" style={{ color: "var(--navy-900)", padding: 0 }}>
          <img src="/favicon.svg" alt="" />
          <div><b>{BRAND_NAME}</b><small style={{ color: "var(--muted)" }}>PayPal Resolution Console</small></div>
        </div>
        <div className="stack gap-8">
          <h1 className="h2">{creating ? "Create a merchant account" : "Sign in to review disputes"}</h1>
          <p className="text-2">{creating ? "Create a local account for this backend." : "Use your merchant account to access the console."}</p>
        </div>
        <form className="stack gap-12" onSubmit={submit}>
          {creating && <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" minLength={creating ? 8 : undefined} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <Notice>{error}</Notice>}
          <Button type="submit" block disabled={busy}><KeyRound size={18} />{busy ? "Please wait..." : creating ? "Create account" : "Sign in"}</Button>
        </form>
        <button type="button" className="link" onClick={() => { setCreating(!creating); setError(""); }}>
          {creating ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>
        <Notice icon={ShieldCheck}>Every decision needs a staff confirmation and is recorded in the backend audit log.</Notice>
      </Card>
    </div>
  );
}
