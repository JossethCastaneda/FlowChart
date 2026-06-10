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
    env: {
      // Deterministic 32-byte key (64 hex chars) so encryption round-trip
      // tests are stable. Not a real secret — test-only.
      ENCRYPTION_KEY: "0".repeat(64),
    },
  },
});
