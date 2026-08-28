import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectDirectory = path.dirname(
  fileURLToPath(import.meta.url),
);

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],

    // Vitest should only run component/unit tests inside src.
    include: ["src/**/*.test.{ts,tsx}"],

    // Playwright runs files in e2e separately.
    exclude: ["e2e/**", "node_modules/**"],

    css: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(projectDirectory, "./src"),
    },
  },
});