// The backend owns the session in an HttpOnly cookie. Local storage is retained
// only for mock mode, where no backend session exists.
import { useSyncExternalStore } from "react";
import { API_URL, USE_MOCK } from "./config";

const KEY = "dh_staff";
const listeners = new Set();
const DEFAULT = { id: "staff-diana", name: "Diana R.", initials: "DR", role: "Resolution specialist" };

let cached = USE_MOCK ? undefined : undefined; // undefined while the backend session is loading
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getStaff() {
  if (USE_MOCK && cached === undefined) cached = read();
  return cached;
}

function publish(staff) {
  cached = staff;
  if (USE_MOCK) {
    try { staff ? localStorage.setItem(KEY, JSON.stringify(staff)) : localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  }
  listeners.forEach((l) => l());
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.detail || "Unable to sign in");
    error.status = res.status;
    throw error;
  }
  const user = await res.json();
  publish({ id: user.name, name: user.name, initials: user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: user.role });
}

export async function signup(email, name, password) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
    body: JSON.stringify({ email, name, role: "merchant", password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.detail || "Unable to create account");
    error.status = res.status;
    throw error;
  }
  const user = await res.json();
  publish({ id: user.name, name: user.name, initials: user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: user.role });
}

export function signIn(staff = DEFAULT) {
  publish(staff);
}

export function signOut() {
  if (!USE_MOCK) {
    fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      credentials: "include",
    }).catch(() => {});
  }
  publish(null);
}
export function useStaff() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getStaff);
}

if (!USE_MOCK) {
  fetch(`${API_URL}/auth/me`, { credentials: "include", headers: { Accept: "application/json" } })
    .then(async (res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((user) => {
      if (!user) return publish(null);
      publish({ id: user.name, name: user.name, initials: user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: user.role });
    })
    .catch(() => publish(null));
}
