import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [react()],
  root: resolve("web/guest-site"),
  build: { outDir: resolve("dist/guest"), emptyOutDir: true },
});
