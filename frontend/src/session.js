import { useSyncExternalStore } from "react";
// Pretend login for the demo. Remembers who "signed in" so back/home buttons
// go to the right place. Replace with real auth (backend session) later.
const KEY = "dh_role"; // "merchant" | "individual" | null

export function getRole() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setRole(role) {
  try { role ? localStorage.setItem(KEY, role) : localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}
/** Where "home" is for the current visitor. */
export function homePath() {
  const r = getRole();
  return r === "merchant" ? "/merchant" : r === "individual" ? "/me" : "/";
}

/* ---- PayPal connection (demo state, shared by Home and Settings) ---- */
const PP_KEY = "dh_paypal";
const listeners = new Set();
export function isPaypalConnected() {
  try { return localStorage.getItem(PP_KEY) !== "off"; } catch { return true; }
}
export function setPaypalConnected(on) {
  try { localStorage.setItem(PP_KEY, on ? "on" : "off"); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
export function usePaypalConnected() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, isPaypalConnected);
}
