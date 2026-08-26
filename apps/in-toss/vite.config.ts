import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = path.resolve(appRoot, "../..");

export default defineConfig({
  base: "./",
  build: {
    emptyOutDir: true,
    outDir: path.resolve(repositoryRoot, "dist"),
    sourcemap: false,
  },
  css: {
    postcss: path.resolve(repositoryRoot, "postcss.config.mjs"),
  },
  envDir: repositoryRoot,
  plugins: [react()],
  publicDir: path.resolve(repositoryRoot, "public"),
  resolve: {
    alias: {
      "@": repositoryRoot,
    },
  },
  root: appRoot,
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
