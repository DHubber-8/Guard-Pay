import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, House, X, Menu, Inbox, Truck, ChartColumn, ScanSearch, Settings, ShieldCheck, User, Store } from "lucide-react";
import { Logo, Button } from "../components/ui";
import { BRAND_NAME, SUPPORT_EMAIL } from "../config";
import { merchant } from "../mock/data";
import { getRole, homePath, setRole } from "../session";
import { AuthArt, Backdrop } from "../components/Art";
import pastel from "../assets/art/pastel.webp";
import agate from "../assets/art/agate.webp";

// Moodboard photos used as soft page backgrounds (blurred + light veil so text stays readable)
export const photo = (img) => ({ className: "photo-bg", style: { "--bg-img": `url(${img})` } });
export const BG = { orderHelp: pastel, setup: agate };

/* ---------- Public site (landing + feature pages) ---------- */
const SITE_LINKS = [["about", "About"], ["features", "Features"], ["how", "How it works"], ["who", "Who it's for"], ["contact", "Contact"]];

export function LandingLayout() {
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname, hash]);
  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <Logo />
          <nav className={`navlinks site-links ${open ? "open" : ""}`}>
            {SITE_LINKS.map(([id, label]) => <Link key={id} className="navlink" to={`/#${id}`}>{label}</Link>)}
          </nav>
          <div className="row gap-8 nav-actions">
            <Button kind="secondary" size="sm" to="/signin">Log in</Button>
            <Button size="sm" to="/start">Get started</Button>
            <button className="icon-btn only-mobile" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </div>
      </header>
      <div key={pathname} className="route-anim"><Outlet /></div>
      <footer style={{ background: "var(--navy-900)", color: "#c9d3da" }}>
        <div className="page row between wrap gap-16" style={{ paddingTop: 32, paddingBottom: 32 }}>
          <span className="small">© 2026 {BRAND_NAME}</span>
          <div className="row gap-24 small wrap">
            <a href="#">Privacy</a><a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ---------- Auth (split screen, fits in one screen on laptops) ---------- */
export function AuthLayout({ children }) {
  return (
    <div className="auth-grid">
      <div className="auth-form">
        <div className="row between"><Logo /><Link to="/" className="crumb"><ArrowLeft size={16} />Back to home</Link></div>
        <div className="auth-form-body"><div style={{ width: "100%", maxWidth: 420 }}>{children}</div></div>
      </div>
      <div className="auth-art">
        <div className="art" style={{ height: "100%" }}>
          <AuthArt />
          <div style={{ position: "absolute", left: 48, right: 48, top: "50%", transform: "translateY(-60%)", color: "var(--navy-900)" }}>
            <span className="caption accent-text">{BRAND_NAME}</span>
            <p className="h1" style={{ maxWidth: 460, marginTop: 12 }}>Most disputes are just misunderstandings.</p>
            <p className="text-2" style={{ marginTop: 12, fontSize: 18 }}>We clear them up with proof, in seconds.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Merchant app ---------- */
const MERCHANT_LINKS = [
  ["/merchant", "Home", House, true],
  ["/merchant/inbox", "Inbox", Inbox],
  ["/merchant/shipments", "Shipments", Truck],
  ["/merchant/insights", "Insights", ChartColumn],
  ["/merchant/scam-check", "Scam Check", ScanSearch],
  ["/merchant/settings", "Settings", Settings],
];

export function MerchantLayout() {
  const { pathname } = useLocation();
  useEffect(() => setRole("merchant"), []); // demo: opening the merchant app counts as signed in
  return (
    <div className="app-bg bg-soft has-backdrop">
      <Backdrop kind="dunes" />
      <header className="topnav">
        <div className="topnav-inner merchant-nav">
          <Logo to="/merchant" />
          <nav className="navlinks">
            {MERCHANT_LINKS.map(([to, label, Icon, end]) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}>
                <Icon size={17} /><span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <Link to="/merchant/settings" className="row gap-8">
            <span className="avatar">DR</span>
            <span className="small body-strong hide-mobile">{merchant.name}</span>
          </Link>
        </div>
      </header>
      <main key={pathname} className="page route-anim"><Outlet /></main>
    </div>
  );
}

/* ---------- Phone-style flows (Individual + Scam Check) ----------
   On a phone they fill the screen. On a laptop they sit in a centred
   panel under a normal top bar, so they don't look like a phone mock-up. */
function DeskBar({ individual }) {
  const home = homePath();
  return (
    <header className="topnav desk-only">
      <div className="topnav-inner">
        <Logo />
        {individual ? (
          <nav className="navlinks">
            <NavLink to="/me" end className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}><House size={17} /><span>Home</span></NavLink>
            <NavLink to="/scam-check" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}><ShieldCheck size={17} /><span>Scam Check</span></NavLink>
            <NavLink to="/me/account" className={({ isActive }) => `navlink ${isActive ? "active" : ""}`}><User size={17} /><span>Account</span></NavLink>
          </nav>
        ) : (
          <Link to={home} className="crumb" style={{ marginLeft: "auto" }}><ArrowLeft size={16} />{home === "/" ? "Back to home" : "Back to my home"}</Link>
        )}
      </div>
    </header>
  );
}

/** Back = the page you really came from. Only when there is no history
 *  (link opened directly) it falls back to `fallback` or your home. */
export function useGoBack(fallback) {
  const nav = useNavigate();
  return () => (window.history.state?.idx > 0 ? nav(-1) : nav(fallback || homePath(), { replace: true }));
}

export function Mobile({ title, back = true, fallback, tabs, wide, footer, children }) {
  const home = homePath();
  const goBack = useGoBack(fallback);
  return (
    <div className={`mobile-shell bg-soft has-backdrop ${wide ? "wide" : ""}`}>
      <Backdrop kind="ribbon" />
      <DeskBar individual={tabs || getRole() === "individual"} />
      <div className="mobile">
        <header className="mobile-header">
          {back ? <button className="icon-btn" aria-label="Back" onClick={goBack}><ArrowLeft size={22} /></button> : <span />}
          <h1>{title}</h1>
          <Link to={home} className="icon-btn mobile-only-flex" aria-label="Home" title="Home"><House size={20} /></Link>
        </header>
        <div className="mobile-body">
          {wide && <h1 className="h1 desk-title">{title}</h1>}
          {children}
        </div>
        {footer && <div className="mobile-foot">{footer}</div>}
        {tabs && <IndividualTabs />}
      </div>
    </div>
  );
}

function IndividualTabs() {
  const cls = ({ isActive }) => (isActive ? "active" : "");
  return (
    <nav className="tabbar">
      <NavLink to="/me" end className={cls}><House size={20} />Home</NavLink>
      <NavLink to="/scam-check" className={cls}><ShieldCheck size={20} />Scam Check</NavLink>
      <NavLink to="/me/account" className={cls}><User size={20} />Account</NavLink>
    </nav>
  );
}

/* ---------- Order Help (buyer, no login, merchant branding) ---------- */
export function OrderHelp({ step, children, footer }) {
  return (
    <div className="mobile-shell bg-soft has-backdrop">
      <Backdrop kind="brush" />
      <div className="mobile">
        <header className="row gap-12" style={{ padding: "14px 20px", background: "var(--white)", borderBottom: "1px solid var(--line)" }}>
          <span className="avatar" style={{ background: "var(--mist-200)", color: "var(--navy-700)" }}><Store size={18} /></span>
          <div className="grow stack">
            <span className="body-strong">Diana Richella</span>
            <span className="small muted">Order Help</span>
          </div>
          {step && <span className="caption muted">Step {step}</span>}
          <Link to={getRole() === "individual" ? "/me" : "/store"} className="icon-btn" aria-label="Close" title="Close"><X size={20} /></Link>
        </header>
        <div className="mobile-body">{children}</div>
        {footer && <div className="mobile-foot">{footer}</div>}
        <p className="small muted center powered">
          Powered by {BRAND_NAME} · You can always <Link to="/help/diana-richella/paypal" style={{ color: "var(--navy-700)", fontWeight: 600 }}>go to PayPal</Link>
        </p>
      </div>
    </div>
  );
}
