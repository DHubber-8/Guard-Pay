// Pretend staff sign-in for the demo. Replace with PayPal staff SSO (backend
// session, GET /auth/me) later. Storage can be blocked, so every access is wrapped.
import { useSyncExternalStore } from "react";

const KEY = "dh_staff";
const listeners = new Set();
const DEFAULT = { id: "staff-diana", name: "Diana R.", initials: "DR", role: "Resolution specialist" };

let cached = null;
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getStaff() {
  if (cached === null) cached = read() || DEFAULT;
  return cached;
}
export function signIn(staff = DEFAULT) {
  cached = staff;
  try { localStorage.setItem(KEY, JSON.stringify(staff)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
export function signOut() {
  cached = DEFAULT;
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
export function useStaff() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getStaff);
}
