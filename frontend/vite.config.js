import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend URL comes from VITE_API_URL (see .env.example). The backend
// allows http://localhost:5173 through FRONTEND_ORIGIN, so keep this port.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
