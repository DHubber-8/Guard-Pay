// The staff console shell: sidebar navigation, a top bar with search, and the page.
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, UserSearch, Flag, ChartColumn, ScrollText, Search, Menu, LogOut, FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { BRAND_NAME, USE_MOCK } from "../config";
import { useStaff, signOut } from "../session";

const LINKS = [
  ["/", "Overview", LayoutDashboard, true],
  ["/queue", "Dispute queue", ListChecks, false, "queue"],
  ["/checks", "Account check", UserSearch],
  ["/flags", "Flags", Flag, false, "flags"],
  ["/insights", "Insights", ChartColumn],
  ["/audit", "Audit log", ScrollText],
];

const NARROW = "(max-width: 960px)";
const isNarrow = () => typeof window !== "undefined" && window.matchMedia?.(NARROW).matches;

/** Case IDs open the case; anything else (email, transaction ID) opens Account check. */
export function searchTarget(q) {
  const v = q.trim();
  if (!v) return null;
  return /^PP-D-/i.test(v) ? `/cases/${v.toUpperCase()}` : `/checks?q=${encodeURIComponent(v)}`;
}

export default function ConsoleLayout() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const staff = useStaff();
  const [open, setOpen] = useState(false);
  // At 960px and below the sidebar is a slide-in menu: hidden from keyboard and
  // screen readers while closed, focused when opened.
  const [narrow, setNarrow] = useState(isNarrow);
  const sideRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    const m = window.matchMedia?.(NARROW);
    if (!m) return undefined;
    const update = () => setNarrow(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (open && narrow) sideRef.current?.querySelector("a")?.focus(); }, [open, narrow]);
  const closeMenu = () => { setOpen(false); menuRef.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && closeMenu();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const [q, setQ] = useState("");
  const { data: cases = [] } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
  const { data: flags = [] } = useQuery({ queryKey: ["flags"], queryFn: api.getFlags });
  const counts = { queue: cases.filter((c) => c.status !== "Resolved").length, flags: flags.length };
  useEffect(() => setOpen(false), [pathname]);

  const search = (e) => {
    e.preventDefault();
    const to = searchTarget(q);
    if (to) { nav(to); setQ(""); }
  };

  return (
    <div className={`console ${open ? "menu-open" : ""}`}>
      <aside className="side" aria-label="Main" ref={sideRef} inert={narrow && !open}>
        <div className="side-brand">
          <img src="/favicon.svg" alt="" />
          <div><b>{BRAND_NAME}</b><small>PayPal Resolution Console</small></div>
        </div>
        {LINKS.map(([to, label, Icon, end, countKey]) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
            <Icon size={18} />{label}
            {countKey && counts[countKey] > 0 && <span className="count">{counts[countKey]}</span>}
          </NavLink>
        ))}
        <div className="side-foot">
          <div className="side-user">
            <span className="avatar">{staff.initials}</span>
            <div><span className="small body-strong">{staff.name}</span><small>{staff.role}</small></div>
          </div>
          <button type="button" className="side-signout" onClick={() => { signOut(); nav("/signin"); }}><LogOut size={14} />Sign out</button>
        </div>
      </aside>
      <div className="side-scrim" onClick={closeMenu} />
      <div className="console-main">
        <header className="console-top">
          <button ref={menuRef} className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} /></button>
          <form className="top-search" onSubmit={search} role="search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case ID, transaction ID or email" aria-label="Search" />
          </form>
          {USE_MOCK && <span className="env-badge" title="Showing demo data from PayPal sandbox accounts"><FlaskConical size={14} /><span>Sandbox data</span></span>}
        </header>
        <main key={pathname} className="console-page route-anim"><Outlet /></main>
      </div>
    </div>
  );
}
