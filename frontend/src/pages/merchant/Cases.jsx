// 09 Order Help case · 10 Formal dispute · 11 Approve confirmation (modal) · 12 Risk alert
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronRight, CircleCheck, CircleHelp, ImageIcon, Sparkles, ShieldAlert, TriangleAlert, Lock } from "lucide-react";
import { api } from "../../api";
import { Button, Card, Badge, RiskBadge, KV, Modal, RadioCard, UploadBox, Notice, Skeleton, Textarea, useToast } from "../../components/ui";
import FindingsPanel, { EvidenceBadge } from "../../components/FindingsPanel";

function Head({ crumb, title, badges }) {
  return (
    <div className="stack gap-12">
      <div className="crumb"><Link to="/merchant/inbox">Inbox</Link><ChevronRight size={14} /><span>{crumb}</span></div>
      <div className="row gap-12 wrap"><h1 className="h1">{title}</h1>{badges}</div>
    </div>
  );
}

function Loading() {
  return <div className="stack gap-16"><Skeleton h={40} w={420} /><Skeleton h={240} /><Skeleton h={180} /></div>;
}

/* ---------- 09 + 11 ---------- */
export function OrderHelpCase() {
  const { data: c } = useQuery({ queryKey: ["ohcase", "1051"], queryFn: () => api.getOrderHelpCase("1051") });
  const [offer, setOffer] = useState("partial");
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [ownReply, setOwnReply] = useState(false);
  const [toast, showToast] = useToast();
  const approve = useMutation({ mutationFn: () => api.approveOffer("1051", offer), onSuccess: () => { setConfirm(false); setDone(true); showToast("Refund sent · the buyer has been emailed"); } });
  if (!c) return <Loading />;
  const chosen = c.offers.find((o) => o.id === offer);
  return (
    <div className="stack gap-24">
      <Head crumb={`Order ${c.order}`} title={`Item arrived damaged · ${c.order}`} badges={<><Badge level="info">Order Help</Badge>{done ? <Badge level="low">Refund sent</Badge> : <Badge level="medium">Waiting for you</Badge>}</>} />
      <div className="cols">
        <div className="stack gap-24">
          <Card>
            <div className="row between"><h2 className="h3">Buyer's message</h2><span className="small muted">Reason: {c.reason}</span></div>
            <p style={{ fontSize: 17 }}>"{c.message}"</p>
            <div className="row gap-12">
              {["Photo 1", "Photo 2"].map((p) => (
                <div key={p} className="stack" style={{ width: 160, height: 120, borderRadius: 12, background: "var(--cream-200)", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <ImageIcon size={22} color="var(--muted)" /><span className="small muted">{p}</span>
                </div>
              ))}
            </div>
          </Card>
          <FindingsPanel {...c.findings} />
          <Card>
            <h2 className="h3">Message history</h2>
            {c.history.map((h) => (
              <div key={h.at + h.who} className="row gap-12" style={{ alignItems: "flex-start" }}>
                <span className={`avatar`} style={h.who === "AI" ? { background: "var(--mist-200)", color: "var(--navy-700)" } : undefined}>{h.who === "AI" ? <Sparkles size={16} /> : "MG"}</span>
                <div className="stack"><span className="small muted">{h.who} · {h.at}</span><span>{h.text}</span></div>
              </div>
            ))}
          </Card>
        </div>
        <div className="stack gap-24">
          <Card>
            <h2 className="h3">Suggested offer</h2>
            {c.offers.map((o) => (
              <RadioCard key={o.id} selected={offer === o.id} onClick={() => setOffer(o.id)} title={o.title} sub={o.sub}
                right={o.recommended && <Badge level="info">AI pick</Badge>} />
            ))}
            <Button block disabled={done} onClick={() => setConfirm(true)}>{done ? "Approved" : "Approve and send"}</Button>
            <Button kind="ghost" block onClick={() => setOwnReply(!ownReply)}>{ownReply ? "Hide my reply" : "Write my own reply"}</Button>
            {ownReply && (
              <>
                <Textarea label="Your message to Maria" rows={4} defaultValue="Hi Maria, so sorry about the cracked mug! " />
                <Button kind="secondary" block onClick={() => { setOwnReply(false); showToast("Message sent to Maria"); }}>Send message</Button>
              </>
            )}
          </Card>
          <Card><h2 className="h3">Order details</h2><KV rows={c.details} /></Card>
        </div>
      </div>

      {confirm && (
        <Modal onClose={() => setConfirm(false)}>
          <h2 className="h2">{chosen.amount ? `Refund $${chosen.amount} to Maria via PayPal?` : "Send a replacement to Maria?"}</h2>
          <p className="text-2">{chosen.amount ? "The money goes back to the buyer's original payment method. This can't be undone." : "We'll email Maria that a new mug is on its way."}</p>
          <div className="card soft tight">
            <KV rows={[["Order", "#1051"], ["Refund", chosen.amount ? `$${chosen.amount.toFixed(2)} of $40.00` : "None"], ["Message to buyer", "Included"]]} />
          </div>
          <div className="row gap-12 end">
            <Button kind="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button onClick={() => approve.mutate()} disabled={approve.isPending}>{approve.isPending ? "Sending…" : "Confirm"}</Button>
          </div>
        </Modal>
      )}
      {toast}
    </div>
  );
}

/* ---------- 10 ---------- */
export function DisputeCase() {
  const { data: d } = useQuery({ queryKey: ["dispute"], queryFn: () => api.getDispute("PP-D-27891") });
  const [mode, setMode] = useState("contest");
  const [sent, setSent] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [toast, showToast] = useToast();
  if (!d) return <Loading />;
  const items = d.evidence.map((e) => (photo && e.kind === "missing" ? { ...e, kind: "verified", sub: "Added · verified from carrier record" } : e));
  const verified = items.filter((e) => e.kind === "verified").length;
  const status = verified === items.length ? "complete" : verified ? "partial" : "missing";
  return (
    <div className="stack gap-24">
      <Head crumb={`Dispute ${d.id}`} title={`${d.reason} · ${d.order}`} badges={<><Badge level="high">PayPal dispute</Badge><Badge level="medium">Respond in {d.dueIn}</Badge></>} />
      <div className="cols wide-side">
        <div className="stack gap-24">
          {d.why && (
            <Card className="tight" style={{ borderLeft: "4px solid var(--terracotta-500)" }}>
              <span className="caption muted">Why the buyer says it didn't arrive</span>
              <p className="body-strong">{d.why}</p>
              <div className="notice"><Sparkles size={18} color="var(--navy-700)" /><span><b>Compared with tracking:</b> the carrier shows it delivered on 18 Oct and signed by "S. LEE". Worth asking if a neighbour or reception took it.</span></div>
            </Card>
          )}
          <Card>
            <h2 className="h3">Timeline</h2>
            <ul className="timeline">
              {d.timeline.map((t) => (
                <li key={t.date}><span className="small muted">{t.date}</span><span className={`dot ${t.alert ? "alert" : ""}`} /><span>{t.text}</span></li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="h3">Evidence checklist</h2>
            {items.map((e) => (
              <div key={e.title} className="row gap-12">
                {e.kind === "verified" ? <CircleCheck size={20} color="var(--ok)" /> : <CircleHelp size={20} color="var(--warn)" />}
                <div className="grow stack"><span>{e.title}</span><span className="small muted">{e.sub}</span></div>
              </div>
            ))}
            {!photo && <UploadBox title="Add a delivery photo" hint="Screenshot from the carrier app or a photo from the courier" onFiles={() => { setPhoto(true); showToast("Photo added · evidence is now complete"); }} />}
          </Card>
        </div>
        <div className="stack gap-24">
          <Card>
            <div className="row between wrap gap-8"><h2 className="h3">Evidence</h2><div className="row gap-8"><RiskBadge level="low" /><EvidenceBadge status={status} /></div></div>
            <div className="row gap-4">{items.map((e) => <div key={e.title} style={{ flex: 1, height: 10, borderRadius: 99, background: e.kind === "verified" ? "var(--ok)" : "var(--cream-200)", transition: "background .4s" }} />)}</div>
            <p className="small muted">{verified} of {items.length} items verified. {photo ? "Nothing important is missing." : "A delivery photo would complete it."}</p>
          </Card>
          <Card>
            <div className="row gap-8"><Sparkles size={18} color="var(--gold-500)" /><h2 className="h3">Draft response</h2></div>
            <div className="chips">{[["contest", "Contest"], ["offer", "Send offer"]].map(([v, l]) => <button key={v} className={`chip ${mode === v ? "on" : ""}`} onClick={() => setMode(v)}>{l}</button>)}</div>
            <Textarea label={mode === "contest" ? "Response to PayPal" : "Offer to the buyer"} defaultValue={mode === "contest" ? d.draft : "We're sorry for the trouble. We can offer a 50% refund ($32.00) as a goodwill gesture, even though the parcel was delivered and signed for."} rows={8} key={mode} />
            <Button block disabled={sent} onClick={() => { setSent(true); showToast(mode === "contest" ? "Submitted to PayPal · we'll tell you when they decide" : "Offer sent to the buyer"); }}>{sent ? "Submitted to PayPal" : mode === "contest" ? "Approve and submit evidence" : "Approve and send offer"}</Button>
            <p className="small muted row gap-8"><Lock size={14} />Nothing is sent until you approve.</p>
          </Card>
        </div>
      </div>
      {toast}
    </div>
  );
}

/* ---------- 12 ---------- */
export function RiskAlert() {
  const { data: r } = useQuery({ queryKey: ["risk"], queryFn: () => api.getRiskCase("1066") });
  const [act, setAct] = useState("sign");
  const [done, setDone] = useState(false);
  const [toast, showToast] = useToast();
  if (!r) return <Loading />;
  return (
    <div className="stack gap-24">
      <Head crumb={`Order ${r.order}`} title={`New order from a flagged buyer · ${r.order}`} badges={<RiskBadge level="high" />} />
      <div className="cols wide-side">
        <div className="stack gap-24">
          <Card>
            <h2 className="h3">Order summary</h2>
            <KV rows={[["Buyer", `${r.buyer} · ${r.email}`], ["Total", `$${r.total.toFixed(2)} via PayPal`], ["Items", r.items], ["Ship to", <span className="row gap-8" key="s"><TriangleAlert size={16} color="var(--warn)" />Different from billing address</span>]]} />
          </Card>
          <Card>
            <div className="row gap-8"><ShieldAlert size={20} color="var(--danger)" /><h2 className="h3">Why this is flagged</h2></div>
            <ul className="icon-list">{r.reasons.map((t) => <li key={t}><TriangleAlert size={18} color="var(--danger)" />{t}</li>)}</ul>
            <Notice icon={Lock}>Other stores only share a risk score with you, never the buyer's purchases.</Notice>
          </Card>
        </div>
        <Card>
          <h2 className="h3">Choose an action</h2>
          {r.actions.map((a) => <RadioCard key={a.id} selected={act === a.id} onClick={() => setAct(a.id)} title={a.title} sub={a.sub} />)}
          <Button block onClick={() => { setDone(true); showToast(act === "cancel" ? "Order cancelled · $540.00 refunded" : act === "confirm" ? "Email sent to Anna to confirm the address" : "Saved · ship with signature, we'll watch this delivery"); }} disabled={done}>{done ? "Done" : "Confirm action"}</Button>
          <p className="small muted">The AI never cancels an order on its own. You decide.</p>
        </Card>
      </div>
      {toast}
    </div>
  );
}
