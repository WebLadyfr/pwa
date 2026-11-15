import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Les tests rendent quelques composants React (tsconfig garde jsx: preserve pour Next).
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@rules": path.resolve(import.meta.dirname, "rules"),
      // `server-only` jette hors du bundler Next : on le neutralise pour les tests unitaires.
      "server-only": path.resolve(import.meta.dirname, "src/lib/server/server-only-stub.ts"),
    },
  },
  // vmThreads : les pools par défaut échouent sur cette machine (Node 24 / Windows : « reading 'config' »).
  test: { pool: "vmThreads", environment: "node", include: ["src/**/*.test.ts"] },
});
