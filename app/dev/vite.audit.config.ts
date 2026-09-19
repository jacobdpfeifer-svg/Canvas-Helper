import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const app = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
export default defineConfig({
  root: app,
  plugins: [react()],
  build: { outDir: "/tmp/pn-prod-c/dist", emptyOutDir: true, rollupOptions: { input: { main: resolve(app, "index.html"), fixture: resolve(app, "dev/fixture.html") } } },
  preview: { port: 1431, strictPort: true },
});
