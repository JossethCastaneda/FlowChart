import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mismo alias "@/*" que tsconfig.json, para que los tests importen
    // igual que el código de la app.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.ts", "app/**/*.ts", "app/**/*.tsx"],
      exclude: ["node_modules/", "tests/"]
    },
    env: {
      // Valores dummy SOLO para tests: lib/env.ts valida el entorno al importar
      // (parseEnv lanza si faltan variables críticas), y varios módulos lo
      // importan de forma transitiva. No son secretos reales.
      ENCRYPTION_KEY: "0".repeat(64),
      NEXTAUTH_SECRET: "ci-test-secret",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      FACEBOOK_CLIENT_ID: "ci-test-fb-id",
      FACEBOOK_CLIENT_SECRET: "ci-test-fb-secret",
    },
  },
});
