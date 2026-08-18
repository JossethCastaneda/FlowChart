#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { Client } from "pg";
import { config as loadEnv } from "dotenv";

for (const path of [".env", ".env.local"]) {
  if (existsSync(path)) loadEnv({ path, override: false, quiet: true });
}

const cloneUrl = process.env.MIGRATION_TEST_DB_URL;
const productionUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.STORAGE_DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.STORAGE_POSTGRES_PRISMA_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!cloneUrl || !productionUrl) throw new Error("POST_INSPECTION_URLS_REQUIRED");

const baseline = readFileSync(
  ".tmp/migration-baseline-lab/migrations/20260817000000_canonical_baseline/migration.sql",
);
const expectedChecksum = createHash("sha256").update(baseline).digest("hex");

async function inspectClone() {
  const client = new Client({ connectionString: cloneUrl });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const metadata = (await client.query(`
      SELECT migration_name, checksum,
             finished_at IS NOT NULL AS finished,
             rolled_back_at IS NULL AS not_rolled_back,
             COALESCE(logs, '') = '' AS no_error_logs
      FROM public._prisma_migrations
      ORDER BY started_at
    `)).rows;
    const leftovers = (await client.query(`
      SELECT count(*)::int AS count,
             COALESCE(array_agg(datname ORDER BY datname), ARRAY[]::name[]) AS names
      FROM pg_database
      WHERE datname LIKE 'codex_migration_disposable_%'
         OR datname LIKE 'codex_fresh_checkout_%'
    `)).rows[0];
    await client.query("COMMIT");
    return {
      metadata,
      disposable_databases_remaining: leftovers.count,
      disposable_database_names: leftovers.names,
    };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

async function inspectProduction() {
  const client = new Client({ connectionString: productionUrl });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const exists = (await client.query(`
      SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists
    `)).rows[0].exists;
    await client.query("COMMIT");
    return { prisma_migrations_exists: exists };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

const clone = await inspectClone();
const production = await inspectProduction();
const row = clone.metadata[0];
console.log(`CLONE_BASELINE_METADATA_ROWS: ${clone.metadata.length}`);
console.log(`CLONE_BASELINE_MIGRATION_NAME: ${row?.migration_name || "MISSING"}`);
console.log(`CLONE_BASELINE_CHECKSUM_MATCH: ${row?.checksum === expectedChecksum ? "PASS" : "FAIL"}`);
console.log(`CLONE_BASELINE_FINISHED: ${row?.finished ? "PASS" : "FAIL"}`);
console.log(`CLONE_BASELINE_NOT_ROLLED_BACK: ${row?.not_rolled_back ? "PASS" : "FAIL"}`);
console.log(`CLONE_BASELINE_NO_ERROR_LOGS: ${row?.no_error_logs ? "PASS" : "FAIL"}`);
console.log(`DISPOSABLE_DATABASES_REMAINING: ${clone.disposable_databases_remaining}`);
const disposableNames = Array.isArray(clone.disposable_database_names)
  ? clone.disposable_database_names.join(',')
  : String(clone.disposable_database_names || '').replace(/^\{|\}$/g, '');
console.log(`DISPOSABLE_DATABASE_NAMES: ${disposableNames || 'NONE'}`);
console.log(`PRODUCTION_PRISMA_MIGRATIONS_EXISTS: ${production.prisma_migrations_exists ? "YES" : "NO"}`);
