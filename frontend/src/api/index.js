// All data access goes through here. Pages call these with useQuery(), e.g.
//   const { data, isLoading } = useQuery({ queryKey: ["cases"], queryFn: api.getCases });
//
// Matches the FastAPI backend in /backend (routes have no /api prefix).
// While USE_MOCK is true (default) the fake data in src/mock is returned.
// Set VITE_USE_MOCK=false in frontend/.env to call the real backend.
import { API_URL } from "../config";

export async function http(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  health: () => http("/health"),
};
