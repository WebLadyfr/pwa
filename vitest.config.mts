import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@rules": path.resolve(import.meta.dirname, "rules"),
      // `server-only` jette hors du bundler Next : on le neutralise pour les tests unitaires.
      "server-only": path.resolve(import.meta.dirname, "src/lib/server/server-only-stub.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
