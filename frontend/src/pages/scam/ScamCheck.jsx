// 19–24 Scam Check (mobile): intro → describe → analyzing → follow-up → result → decision
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, TriangleAlert, ShieldCheck, Loader, CircleCheck, Search } from "lucide-react";
import { Mobile } from "../../layouts/layouts";
import { Button, Card, Badge, RiskBadge, Textarea, Input, PhotoPicker, Notice, IconList, RadioCard, Toast } from "../../components/ui";
import { homePath } from "../../session";
import { api } from "../../api";
import { USE_MOCK } from "../../config";

// The id of the check being worked on, so the decision is saved to the right one
const CHECK_KEY = "scamCheckId";
const saveId = (id) => { try { sessionStorage.setItem(CHECK_KEY, id); } catch { /* storage blocked */ } };
const loadId = () => { try { return sessionStorage.getItem(CHECK_KEY) || "latest"; } catch { return "latest"; } };
import pastel from "../../assets/art/pastel.webp";

export function ScamIntro() {
  return (
    <Mobile title="Scam Check" footer={<Button block to="/scam-check/new">Start a check</Button>}>
      <div className="art scam-art" style={{ height: 200 }}><img src={pastel} alt="" />
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <span className="icon-bubble lg" style={{ width: 80, height: 80, borderRadius: 24, background: "white", boxShadow: "var(--shadow-md)" }}><ShieldCheck size={38} /></span>
        </div>
      </div>
      <h1 className="h2">Not sure if something is a scam?</h1>
      <p className="text-2">Tell us what happened. Our AI checks it and tells you how risky it looks and what to do next.</p>
      <IconList icon={Check} color="var(--ok)" items={["Messages, emails, links, payment requests", "Takes about 1 minute", "Free and private"]} />
      <Notice icon={TriangleAlert} tone="warm">We never ask for your password, card number or one-time codes. Hide them before uploading.</Notice>
    </Mobile>
  );
}

export function ScamDescribe() {
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [shots, setShots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const check = async () => {
    setBusy(true); setFailed(false);
    try {
      const res = await api.submitScamCheck({ description: text, link_or_sender: link, screenshots: shots });
      saveId(res.id);
      nav("/scam-check/analyzing");
    } catch { setFailed(true); setBusy(false); }
  };
  return (
    <Mobile title="New check" footer={<>
      {failed && <Notice icon={TriangleAlert} tone="warm">We couldn't start the check. Please try again.</Notice>}
      <Button block disabled={text.trim().length < 5 || busy} onClick={check}>{busy ? "Sending…" : "Check it"}</Button>
    </>}>
      <span className="caption muted">Step 1 of 2</span>
      <h1 className="h2">What happened?</h1>
      <Textarea label="Describe it in your own words" value={text} onChange={(e) => setText(e.target.value)} rows={4}
        placeholder="e.g. Someone on Instagram says I won a prize and needs $20 for shipping…" />
      <Input label="Link or sender (optional)" placeholder="https:// or email / phone number" value={link} onChange={(e) => setLink(e.target.value)} />
      <PhotoPicker label="Add screenshots (optional)" hint="Up to 5. Hide passwords and codes first." onChange={setShots} />
      {text.trim().length < 5 && <p className="small muted">Write a few words about what happened to continue.</p>}
    </Mobile>
  );
}

const CHECK_STEPS = [
  ["Reading your screenshots", "Looking for names, amounts and links in your images"],
  ["Checking the link and sender", "Comparing the address with the real company's domain"],
  ["Comparing with known scams", "Matching your story against common scam patterns"],
  ["Writing your result", "Turning what we found into clear next steps"],
];

export function ScamAnalyzing() {
  const nav = useNavigate();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => Math.min(p + 2, 100)), 60);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    // replace: pressing back on the next screen shouldn't land here again
    if (pct >= 100) { const t = setTimeout(() => nav("/scam-check/questions", { replace: true }), 300); return () => clearTimeout(t); }
  }, [pct, nav]);
  const step = Math.min(Math.floor(pct / 25), 3);
  const [now, detail] = CHECK_STEPS[step];
  return (
    <Mobile title="Checking…" back={false}>
      <div className="stack gap-24" style={{ alignItems: "center", paddingTop: 40 }}>
        <div className="progress-ring" style={{ "--p": pct }}>
          <span className="h2" style={{ fontFamily: "var(--font-display)" }}>{pct}%</span>
        </div>
        <div className="stack gap-4 center" aria-live="polite">
          <h1 className="h3">{now}…</h1>
          <p className="small muted">{detail}</p>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct}%` }} /></div>
        <div className="stack gap-12" style={{ width: "100%", maxWidth: 320 }}>
          {CHECK_STEPS.map(([t], i) => (
            <div key={t} className="row gap-12">
              {i < step ? <CircleCheck size={20} color="var(--ok)" /> : i === step ? <Loader size={20} className="spin" color="var(--navy-700)" /> : <Search size={20} color="var(--line-strong)" />}
              <span className={i < step ? "" : i === step ? "body-strong" : "muted"}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </Mobile>
  );
}

export function ScamQuestions() {
  const nav = useNavigate();
  const [msgs, setMsgs] = useState([
    { ai: true, t: "Did they ask you to pay with gift cards, crypto or \"Friends and Family\"?" },
    { ai: false, t: "Yes, they said Friends and Family so there are no fees." },
    { ai: true, t: "Have you already sent any money or shared a code?" },
  ]);
  const [input, setInput] = useState("");
  const answered = msgs.length > 3;
  const send = (t) => {
    if (!t.trim()) return;
    setMsgs([...msgs, { ai: false, t }]);
    setInput("");
    setTimeout(() => nav("/scam-check/result"), 900);
  };
  return (
    <Mobile title="A few questions" footer={!answered && (
      <>
        <div className="chips">{["No, not yet", "Yes, I paid", "I shared a code"].map((o) => <button key={o} className="chip" onClick={() => send(o)}>{o}</button>)}</div>
        <div className="row gap-8"><input className="input" placeholder="Or type an answer…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} /><Button onClick={() => send(input)}>Send</Button></div>
        <Button kind="ghost" block to="/scam-check/result">Skip and see result</Button>
      </>
    )}>
      <span className="caption muted">Step 2 of 2 · max 2 rounds</span>
      {msgs.map((m, i) => <div key={i} className={`bubble ${m.ai ? "ai" : "me"}`}>{m.t}</div>)}
      {answered && <div className="bubble ai muted">Thanks. Preparing your result…</div>}
    </Mobile>
  );
}

export function ScamResult() {
  return (
    <Mobile title="Result" footer={<Button block to="/scam-check/decision">Next: your decision</Button>}>
      {USE_MOCK && <Notice>Sample result. Until the AI is connected, every check shows this example instead of an analysis of what you entered.</Notice>}
      <Card style={{ borderTop: "4px solid var(--danger)" }}>
        <div className="row gap-12 wrap"><RiskBadge level="high" /><Badge level="medium">Evidence: partial</Badge></div>
        <h1 className="h2">This has the signs of a prize scam</h1>
      </Card>
      <span className="label muted">Why we think so</span>
      <IconList icon={TriangleAlert} color="var(--danger)" items={["You \"won\" something you never entered", "They want a fee before you get the prize", "Friends and Family payments have no buyer protection"]} />
      <span className="label muted">What to do now</span>
      <IconList icon={ShieldCheck} color="var(--ok)" items={["Don't send money", "Block the account and report the profile", "If you already paid, contact PayPal right away"]} />
      <p className="small muted">This is AI guidance, not a final decision.</p>
    </Mobile>
  );
}

const DONE_TEXT = {
  resolved: "Marked as resolved · saved to your Scam Check history",
  monitor: "We'll remind you in 7 days · saved to your history",
  report: "PayPal opened in a new tab · saved to your history",
};

export function ScamDecision() {
  const nav = useNavigate();
  const [pick, setPick] = useState("resolved");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Save the chosen decision first; only then show the confirmation
  const confirm = async () => {
    setBusy(true); setFailed(false);
    // Open the tab inside the click so the browser doesn't block it
    const tab = pick === "report" ? window.open("https://www.paypal.com/resolutioncenter", "_blank", "noopener") : null;
    try {
      await api.saveScamDecision(loadId(), pick);
      setDone(true);
      setTimeout(() => nav(homePath(), { replace: true }), 1600);
    } catch {
      tab?.close?.();
      setFailed(true);
      setBusy(false);
    }
  };
  return (
    <Mobile title="What next?" footer={<>
      {failed && <Notice icon={TriangleAlert} tone="warm">We couldn't save your choice. Please try again.</Notice>}
      <Button block disabled={busy || done} onClick={confirm}>{busy && !done ? "Saving…" : "Confirm"}</Button>
    </>}>
      <h1 className="h2">What do you want to do?</h1>
      <RadioCard selected={pick === "resolved"} onClick={() => setPick("resolved")} title="Mark as resolved" sub="I didn't pay and I've blocked them" />
      <RadioCard selected={pick === "monitor"} onClick={() => setPick("monitor")} title="Keep monitoring" sub="Remind me to check my PayPal activity in 7 days" />
      <RadioCard selected={pick === "report"} onClick={() => setPick("report")} title="Report to PayPal" sub="Opens PayPal's Resolution Center (needed if you paid)" />
      <Notice>Reporting to PayPal is always your choice. We never contact PayPal for you.</Notice>
      {done && <Toast>{DONE_TEXT[pick]}</Toast>}
    </Mobile>
  );
}
