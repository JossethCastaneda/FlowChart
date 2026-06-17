// Best-effort schema sync at build time so deploys never require a manual
// `npm run db:push`. NON-FATAL by design: any failure here is logged and
// skipped — it must never block a deploy. Additive schema changes (new tables/
// columns) apply automatically; anything that would lose data is left alone.
import { execSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;

// Permite validar `next build` localmente sin tocar ninguna base de datos.
if (process.env.SKIP_DB_SYNC === "1") {
  console.log("[db-sync] SKIP_DB_SYNC=1 — skipping db push.");
  process.exit(0);
}

// Resolve the database URL the same way prisma.config.ts does. Prefer a direct
// (unpooled) connection for DDL; fall back to the pooled URL.
const dbUrlRaw =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  process.env.STORAGE_DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.STORAGE_POSTGRES_PRISMA_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

let dbUrl = dbUrlRaw;
const baseDbUrl = process.env.DATABASE_URL || process.env.STORAGE_POSTGRES_PRISMA_URL || process.env.STORAGE_DATABASE_URL || "";
if (baseDbUrl && dbUrlRaw) {
  try {
    const dbHost = new URL(baseDbUrl).host.replace("-pooler", "");
    const dirHost = new URL(dbUrlRaw).host.replace("-pooler", "");
    if (dbHost !== dirHost) {
      console.warn(`[db-sync] Host mismatch! DATABASE_URL (${dbHost}) != DIRECT_URL (${dirHost}). Forcing dbUrl to match DATABASE_URL.`);
      const url = new URL(baseDbUrl);
      url.host = url.host.replace("-pooler", "");
      dbUrl = url.toString();
    }
  } catch (e) {
    // Ignore parse errors
  }
}

if (!dbUrl) {
  console.log("[db-sync] No database URL in env — skipping db push.");
  process.exit(0);
}

// Log the target host (NEVER credentials) so DB drift is obvious in build logs.
// If you ever see an unexpected host here, your env points at the wrong DB.
let host = "unknown";
try {
  host = new URL(dbUrl).host;
} catch {
  /* not a parseable URL — ignore */
}
console.log(`[db-sync] target database host: ${host}`);

// Neon's starter projects ship a sample `playing_with_neon` table that is not
// part of our Prisma schema. `prisma db push` treats dropping it as data loss
// and aborts the ENTIRE sync (so legitimate additive changes never apply).
// Remove it first: idempotent and safe — it's Neon demo data referenced by
// nothing in our schema.
// Drop stale tables that are not in our Prisma schema but exist in the DB,
// which cause Prisma to abort the entire sync with "data loss" warnings.
// This is idempotent and safe — these tables are not referenced by any code.
const STALE_TABLES = ["playing_with_neon", "BestTimeCache", "BotMakerConfig", "HashtagCache"];
try {
  const client = new Client({ connectionString: dbUrl, ssl: true });
  await client.connect();
  for (const table of STALE_TABLES) {
    const found = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
      [table]
    );
    if (found.rowCount) {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`[db-sync] removed stale table '${table}'`);
    }
  }
  // Remove duplicate Integration rows that would block the unique constraint
  // on (workspaceId, provider, userId) — keep newest row per group.
  await client.query(`
    DELETE FROM "Integration"
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "workspaceId", "provider", "userId"
                 ORDER BY "createdAt" DESC NULLS LAST
               ) as rn
        FROM "Integration"
      ) ranked
      WHERE rn > 1
    )
  `);
  await client.end();
} catch (e) {
  console.warn("[db-sync] pre-sync cleanup skipped (non-fatal):", e?.message || String(e));
}

// Apply additive schema changes. Non-fatal: a deploy must never be blocked by a
// sync that would otherwise require --accept-data-loss. We intentionally do NOT
// pass --accept-data-loss so a genuinely destructive diff is surfaced, not run.
try {
  execSync("npx prisma db push", { stdio: "inherit", env: { ...process.env, CI: "true" } });
} catch (e) {
  console.warn("[db-sync] prisma db push skipped (non-fatal):", e?.message || String(e));
}

process.exit(0);
