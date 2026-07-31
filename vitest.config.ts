import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    // Node by default (pure engine/model tests); component tests opt into jsdom
    // per-file via `// @vitest-environment jsdom`.
    environment: "node",
  },
});
