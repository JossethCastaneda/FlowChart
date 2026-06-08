// Best-effort schema sync at build time so deploys never require a manual
// `npm run db:push`. NON-FATAL by design: if the push fails (DB unreachable, or
// a change that would lose data without --accept-data-loss), it is logged and
// skipped — it never blocks the deploy. Additive changes apply automatically.
import { execSync } from "node:child_process";

const hasDb =
  process.env.DATABASE_URL ||
  process.env.STORAGE_POSTGRES_PRISMA_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!hasDb) {
  console.log("[db-sync] No database URL in env — skipping db push.");
  process.exit(0);
}

try {
  execSync("npx prisma db push", { stdio: "inherit", env: { ...process.env, CI: "true" } });
} catch (e) {
  console.warn("[db-sync] prisma db push skipped (non-fatal):", e?.message || String(e));
}
process.exit(0);
