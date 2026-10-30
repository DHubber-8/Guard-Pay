// 02 Choose account type · 03a Sign in · 03b/03c Sign up · 03d Forgot password
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Store, User, Mail } from "lucide-react";
import { setRole } from "../../session";
import { AuthLayout } from "../../layouts/layouts";
import { Button, Input, Modal, RadioCard, Toast } from "../../components/ui";

function Or() {
  return (
    <div className="row gap-12 small muted"><hr className="divider grow" />or<hr className="divider grow" /></div>
  );
}

function GoogleButton() {
  return (
    <Button kind="secondary" block type="button">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.9 6.5-9.6 6.5-16.1z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41 15.5 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5C3 17.1 2 20.4 2 24s1 6.9 2.5 9.9l7.3-5.7z"/><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 7 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/></svg>
      Continue with Google
    </Button>
  );
}

export function ChooseType() {
  const [type, setType] = useState("business");
  return (
    <AuthLayout>
      <div className="stack gap-24">
        <h1 className="h1">How will you use it?</h1>
        <RadioCard tight={false} selected={type === "business"} onClick={() => setType("business")}
          title={<span className="row gap-8"><Store size={18} />Business</span>}
          sub="I run an online store and want to answer buyers, prevent disputes and check scams." />
        <RadioCard tight={false} selected={type === "individual"} onClick={() => setType("individual")}
          title={<span className="row gap-8"><User size={18} />Individual</span>}
          sub="I want to check a suspicious message, request or charge, or get help with an order." />
        <Button block to={`/signup/${type}`}>Continue</Button>
        <p className="small center muted">Already have an account? <Link to="/signin" className="body-strong" style={{ color: "var(--navy-700)" }}>Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}

export function SignIn() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [toast, setToast] = useState(false);
  const showReset = params.get("reset") === "1";
  return (
    <AuthLayout>
      <form className="stack gap-20" style={{ gap: 20 }} onSubmit={(e) => { e.preventDefault(); setRole("merchant"); nav("/merchant"); }}>
        <div className="stack gap-8">
          <h1 className="h1">Sign in</h1>
          <p className="text-2">Welcome back</p>
        </div>
        <Input label="Email" type="email" placeholder="you@store.com" required />
        <Input label="Password" type="password" placeholder="••••••••" required />
        <div className="row end"><button type="button" className="btn ghost sm" onClick={() => setParams({ reset: "1" })}>Forgot password?</button></div>
        <Button block type="submit">Sign in</Button>
        <Or />
        <GoogleButton />
        <p className="small muted">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
        <p className="small center muted">New here? <Link to="/start" className="body-strong" style={{ color: "var(--navy-700)" }}>Create an account</Link></p>
      </form>
      {showReset && (
        <Modal onClose={() => setParams({})}>
          <span className="icon-bubble lg"><Mail size={24} /></span>
          <h2 className="h2">Reset your password</h2>
          <p className="text-2">Enter the email you signed up with and we'll send you a reset link.</p>
          <Input label="Email" type="email" placeholder="you@store.com" />
          <div className="row gap-12 end">
            <Button kind="secondary" onClick={() => setParams({})}>Cancel</Button>
            <Button onClick={() => { setParams({}); setToast(true); }}>Send reset link</Button>
          </div>
        </Modal>
      )}
      {toast && <Toast onDone={() => setToast(false)}>Reset link sent. Check your email.</Toast>}
    </AuthLayout>
  );
}

export function SignUpIndividual() {
  const nav = useNavigate();
  return (
    <AuthLayout>
      <form className="stack" style={{ gap: 18 }} onSubmit={(e) => { e.preventDefault(); setRole("individual"); nav("/me"); }}>
        <div className="stack gap-8">
          <h1 className="h1">Create your account</h1>
          <p className="text-2">Individual account</p>
        </div>
        <Input label="Full name" placeholder="Maya Lim" required />
        <Input label="Email" type="email" placeholder="you@email.com" required />
        <Input label="Password" type="password" placeholder="At least 8 characters" required />
        <label className="checkbox"><input type="checkbox" required />I agree to the Terms of Service and Privacy Policy</label>
        <Button block type="submit">Create account</Button>
        <Or />
        <GoogleButton />
      </form>
    </AuthLayout>
  );
}

export function SignUpBusiness() {
  const nav = useNavigate();
  return (
    <AuthLayout>
      <form className="stack" style={{ gap: 18 }} onSubmit={(e) => { e.preventDefault(); setRole("merchant"); nav("/onboarding/1"); }}>
        <div className="stack gap-8">
          <h1 className="h1">Create your business account</h1>
          <p className="text-2">You'll connect PayPal in the next step</p>
        </div>
        <Input label="Store name" placeholder="Diana Richella" required />
        <Input label="Store website" placeholder="dianarichella.com" />
        <Input label="Work email" type="email" placeholder="you@store.com" required />
        <Input label="Password" type="password" placeholder="At least 8 characters" required />
        <label className="checkbox"><input type="checkbox" required />I agree to the Terms of Service and Privacy Policy</label>
        <Button block type="submit">Create account</Button>
      </form>
    </AuthLayout>
  );
}
