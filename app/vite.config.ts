import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Repo path contains ':' which breaks Vite's default fs allow-list matching.
    fs: { strict: false },
  },
});
