import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Django backend has no CORS setup, so in dev we proxy /api to it.
// Default target is the hosted API; use VITE_BACKEND=http://localhost:8000 for a local one.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND || "https://kapilagrawal.pythonanywhere.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
