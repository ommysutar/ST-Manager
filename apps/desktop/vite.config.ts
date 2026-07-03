import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(dirname, "../../packages");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  envPrefix: ["VITE_"],
  resolve: {
    alias: {
      // Workspace packages compile to CommonJS; Vite/Rollup cannot reliably
      // tree-shake their dist output. Source aliases keep the desktop bundle
      // working without modifying shared package build settings (M7 scope).
      "@st-manager/api-sdk": path.join(packagesDir, "api-sdk/src/index.ts"),
      "@st-manager/constants": path.join(packagesDir, "constants/src/index.ts"),
      "@st-manager/contracts": path.join(packagesDir, "contracts/src/index.ts"),
      "@st-manager/events": path.join(packagesDir, "events/src/index.ts"),
      "@st-manager/types": path.join(packagesDir, "types/src/index.ts"),
      "@st-manager/validation": path.join(packagesDir, "validation/src/index.ts"),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      "/auth": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/studios": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/sync": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/ai": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
