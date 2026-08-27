import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * The dashboard talks to a Hatch deployment cross-origin, always.
 *
 * There is no dev proxy here, unlike Hatch's own frontend. That one proxies
 * `/api` so the browser only ever speaks relative paths; this one deliberately
 * does not, because the thing being exercised in development is exactly what
 * runs at the booth — an absolute URL, a bearer token, and Hatch's CORS on
 * `/api/staff/*`. A proxy would hide a CORS mistake until show day.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
  build: { outDir: "dist", sourcemap: true },
});
