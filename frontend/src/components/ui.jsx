// Basic building blocks. Each one matches a component in Figma ("Wireframes v2").
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ShieldCheck, Upload, CircleCheck, Camera, ImagePlus, X } from "lucide-react";
import { BRAND_NAME } from "../config";

/** Logo. Clicking it goes to `to` (default: landing) and always scrolls back to the top. */
export function Logo({ light = false, to = "/" }) {
  return (
    <Link to={to} className="logo" style={light ? { color: "white" } : undefined}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={`${BRAND_NAME} home`}>
      <img src="/favicon.svg" width="30" height="30" alt="" />
      <span className="logo-text">{BRAND_NAME}</span>
    </Link>
  );
}

/** Button/Primary, Button/Secondary, Button/Link. Pass `to` to make it a link. */
export function Button({ kind = "primary", size, block, to, children, className = "", ...rest }) {
  const cls = ["btn", kind, size, block && "block", className].filter(Boolean).join(" ");
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="small muted">{hint}</small>}
    </label>
  );
}

export function Input({ label, hint, ...rest }) {
  return <Field label={label} hint={hint}><input className="input" {...rest} /></Field>;
}

export function Textarea({ label, hint, ...rest }) {
  return <Field label={label} hint={hint}><textarea className="textarea" {...rest} /></Field>;
}

/** Badge/High, Medium, Low, Inconclusive, Neutral (+ info, warm) */
export function Badge({ level = "neutral", children }) {
  const map = { inconclusive: "neutral" };
  return <span className={`badge ${map[level] || level}`}>{children}</span>;
}

export function RiskBadge({ level }) {
  const label = { high: "High risk", medium: "Medium risk", low: "Low risk", inconclusive: "Inconclusive" }[level];
  return <Badge level={level}>{label}</Badge>;
}

export function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return <Tag className={`card ${className}`} {...rest}>{children}</Tag>;
}

export function Chips({ items, value, onChange }) {
  return (
    <div className="chips">
      {items.map((it) => (
        <button key={it.value} className={`chip ${value === it.value ? "on" : ""}`} onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)} />
  );
}

/** Selectable card with a radio dot (used for options and reasons).
 *  Keyboard: Tab to reach it, Space/Enter to pick, arrow keys move between the
 *  cards that sit next to each other (like a native radio group). */
export function RadioCard({ selected, onClick, title, sub, tight = true, right }) {
  const onKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick?.(); return; }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const group = [...e.currentTarget.parentElement.querySelectorAll(":scope > [role=radio]")];
    const next = group[(group.indexOf(e.currentTarget) + step + group.length) % group.length];
    next?.focus();
    next?.click();
  };
  return (
    <div className={`card clickable ${tight ? "tight" : ""} ${selected ? "selected" : ""}`} onClick={onClick} onKeyDown={onKeyDown}
      role="radio" aria-checked={!!selected} tabIndex={0}>
      <div className="option">
        <span className="radio-dot" />
        <div className="grow stack gap-4">
          <span className="body-strong">{title}</span>
          {sub && <span className="small muted">{sub}</span>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function UploadBox({ title = "Upload files", hint = "PNG, JPG or PDF · up to 10 MB", onFiles }) {
  const [files, setFiles] = useState([]);
  return (
    <label className="upload">
      <input type="file" multiple hidden onChange={(e) => { const names = [...e.target.files].map((f) => f.name); setFiles(names); if (names.length) onFiles?.(names); }} />
      <Upload size={22} color="var(--navy-700)" />
      <span className="body-strong">{title}</span>
      <span className="small muted">{files.length ? files.join(", ") : hint}</span>
    </label>
  );
}

/** Upload from the device or take a photo with the camera (phones open the camera directly). */
export function PhotoPicker({ label = "Add proof (optional)", hint = "Photos of the parcel, item or messages help the seller decide faster.", onChange }) {
  const [files, setFiles] = useState([]);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => { change.current?.(files.map((f) => f.name)); }, [files]);
  const add = (e) => {
    const list = [...e.target.files].map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setFiles((old) => [...old, ...list].slice(0, 5));
    e.target.value = "";
  };
  return (
    <div className="stack gap-8">
      <span className="label text-2">{label}</span>
      <div className="row gap-8 wrap">
        <label className="btn secondary sm"><ImagePlus size={16} />Upload photo<input type="file" accept="image/*" multiple hidden onChange={add} /></label>
        <label className="btn secondary sm"><Camera size={16} />Take photo<input type="file" accept="image/*" capture="environment" hidden onChange={add} /></label>
      </div>
      {files.length > 0 && (
        <div className="row gap-8 wrap">
          {files.map((f, i) => (
            <div key={f.url} className="thumb">
              <img src={f.url} alt={f.name} />
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <span className="small muted">{hint}</span>
    </div>
  );
}

export function IconList({ icon: Icon, items, color = "var(--navy-700)" }) {
  return (
    <ul className="icon-list">
      {items.map((t) => (
        <li key={t}><Icon size={18} color={color} /><span>{t}</span></li>
      ))}
    </ul>
  );
}

export function Notice({ icon: Icon = ShieldCheck, tone = "", children }) {
  return <div className={`notice ${tone}`}><Icon size={18} /><span>{children}</span></div>;
}

export function KV({ rows }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
    </dl>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ onClose, children }) {
  const box = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  // Focus moves into the dialog, Tab stays inside it, and focus goes back to
  // the button that opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    const items = () => [...(box.current?.querySelectorAll(FOCUSABLE) || [])];
    (items()[0] || box.current)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { close.current?.(); return; }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!box.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, []);
  // Rendered at the end of <body> so no background or panel can cover it
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body
  );
}

export function Toast({ children, onDone }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => { const t = setTimeout(() => done.current?.(), 3000); return () => clearTimeout(t); }, [children]);
  return <div className="toast"><CircleCheck size={18} color="var(--peach-200)" />{children}</div>;
}

/** Fades + slides its content in when it scrolls into view. */
export function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} {...rest}>{children}</Tag>;
}

/** const [toast, showToast] = useToast();  …  showToast("Saved");  …  {toast} */
export function useToast() {
  const [msg, setMsg] = useState(null);
  const el = msg ? <Toast onDone={() => setMsg(null)}>{msg}</Toast> : null;
  return [el, setMsg];
}

export function Skeleton({ h = 20, w = "100%" }) {
  return <div className="skeleton" style={{ height: h, width: w }} />;
}
