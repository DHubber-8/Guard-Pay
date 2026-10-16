export async function apiFetch(path, options = {}) {
  // TODO: Add the shared API client and response error handling.
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  return fetch(`${baseUrl}${path}`, options);
}
