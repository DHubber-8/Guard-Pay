// Change the product name here once the team decides. It updates everywhere.
export const BRAND_NAME = "Dispute Helper";
export const SUPPORT_EMAIL = "dianakarya88@gmail.com";

// Backend address. Same variable as the original scaffold (frontend/.env).
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

// Fake data (default) or the real FastAPI backend. Set VITE_USE_MOCK=false to use the backend.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

// Testing helper: a small "All screens" tab on every page. Set to false before submitting.
export const SHOW_SCREENS_LINK = true;
