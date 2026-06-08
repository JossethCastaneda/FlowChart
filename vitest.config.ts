import { defineConfig } from "vitest/config";

export default defineConfig({
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
