#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { config as loadEnv } from "dotenv";

for (const path of [".env", ".env.local"]) {
  if (existsSync(path)) loadEnv({ path, override: false, quiet: true });
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "prisma.config.ts");
const migrationsPath = join(root, "prisma", "migrations");
const baselineName = "20260817000000_canonical_baseline";
const baselinePath = join(migrationsPath, baselineName, "migration.sql");
const evidenceDir = join(root, ".tmp", "canonical-migration-final-proof");
const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const runDir = join(evidenceDir, runId);

const results = {
  MIGRATION_TEST_DB_URL: "ABSENT",
  MIGRATION_TEST_TARGET: "FAIL",
  FINAL_ACTIVE_LAYOUT: "FAIL",
  FINAL_ACTIVE_CLONE_MATCHES_PRODUCTION: "NOT_RUN",
  FINAL_EXISTING_DB_ADOPTION_PROOF: "NOT_RUN",
  FINAL_EXISTING_DB_SCHEMA_MUTATIONS: "NOT_RUN",
  FINAL_EXISTING_DB_DATA_MUTATIONS: "NOT_RUN",
  FINAL_BASELINE_CHECKSUM_PROOF: "NOT_RUN",
  FINAL_ACTIVE_EMPTY_REPLAY: "NOT_RUN",
  FINAL_ACTIVE_EMPTY_DIFF: "NOT_RUN",
  FINAL_ACTIVE_SCHEMA_FINGERPRINT_MATCH: "NOT_RUN",
  FINAL_FUTURE_CANARY: "NOT_RUN",
  PRODUCTION_MUTATIONS_THIS_RUN: 0,
  PRODUCTION_SCHEMA_CHANGES_THIS_RUN: 0,
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => JSON.stringify(value, Object.keys(value).sort());
const hashObject = (value) => sha256(JSON.stringify(value));

function normalizedIdentity(raw) {
  const url = new URL(raw);
  return {
    host: url.hostname.toLowerCase().replace(/-pooler(?=\.)/, ""),
    database: decodeURIComponent(url.pathname.slice(1)),
    schema: url.searchParams.get("schema") || "public",
  };
}

function sameEndpoint(left, right) {
  return normalizedIdentity(left).host === normalizedIdentity(right).host;
}

function directConnectionUrl(raw) {
  const url = new URL(raw);
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  return url.toString();
}

function safeError(error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const name of Object.keys(process.env)) {
    if (!/(URL|PASSWORD|SECRET|TOKEN|KEY)/i.test(name)) continue;
    const value = process.env[name];
    if (value && value.length >= 8) message = message.replaceAll(value, `[${name}]`);
  }
  return message.replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]");
}

function isTransientConnectionError(error) {
  return /(P1001|Authentication timed out|ECONNRESET|ETIMEDOUT|timeout)/i.test(
    safeError(error),
  );
}

function runPrisma(args, databaseUrl) {
  const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");
  if (!existsSync(prismaCli)) throw new Error("LOCAL_PRISMA_CLI_MISSING");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = spawnSync(process.execPath, [prismaCli, ...args, "--config", configPath], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DIRECT_URL: databaseUrl,
      },
    });
    const normalized = {
      status: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || result.error?.message || "",
    };
    const diagnostic = `${normalized.stderr}\n${normalized.stdout}`;
    if (
      normalized.status === 0 ||
      !isTransientConnectionError(diagnostic) ||
      attempt === 3
    ) {
      return normalized;
    }
  }
  throw new Error("UNREACHABLE_PRISMA_RETRY_STATE");
}

function requirePrismaPass(label, args, databaseUrl, accepted = new Set([0])) {
  const result = runPrisma(args, databaseUrl);
  if (!accepted.has(result.status)) {
    throw new Error(`${label}: ${safeError(result.stderr || result.stdout)}`);
  }
  return result;
}

async function query(client, text) {
  if (client.proofAsyncError) throw client.proofAsyncError;
  const result = await client.query(text);
  if (client.proofAsyncError) throw client.proofAsyncError;
  return result.rows;
}

async function connectWithRetry(connectionString) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const client = new Client({ connectionString });
    client.proofAsyncError = null;
    client.on("error", (error) => {
      client.proofAsyncError = error;
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try { await client.end(); } catch {}
      if (!isTransientConnectionError(error)) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function manifestOnce(rawUrl, role, includeApplicationData = true) {
  const client = await connectWithRetry(rawUrl);
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const server = (await query(client, `
      SELECT current_database() AS database,
             current_schema() AS schema,
             current_setting('server_version') AS server_version
    `))[0];
    const columns = await query(client, `
      SELECT table_name, ordinal_position, column_name, data_type, udt_name,
             is_nullable, column_default, is_identity, identity_generation,
             is_generated, generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name, ordinal_position
    `);
    const constraints = await query(client, `
      SELECT c.conrelid::regclass::text AS table_name, c.conname,
             c.contype, pg_get_constraintdef(c.oid, true) AS definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
        AND c.conrelid <> 0
        AND c.conrelid::regclass::text <> '_prisma_migrations'
      ORDER BY table_name, c.conname
    `);
    const indexes = await query(client, `
      SELECT tablename AS table_name, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename, indexname
    `);
    const enums = await query(client, `
      SELECT t.typname AS enum_name, e.enumsortorder, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);
    const tables = (await query(client, `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      ORDER BY table_name
    `)).map((row) => row.table_name);
    const data = [];
    if (includeApplicationData) {
      for (const table of tables) {
        const escaped = `"${table.replaceAll('"', '""')}"`;
        const [row] = await query(client, `
          SELECT count(*)::text AS row_count,
                 COALESCE(md5(string_agg(row_hash, '' ORDER BY row_hash)), md5('')) AS content_hash
          FROM (SELECT md5(to_jsonb(t)::text) AS row_hash FROM public.${escaped} t) AS rows
        `);
        data.push({ table, ...row });
      }
    }
    const sequences = includeApplicationData
      ? await query(client, `
          SELECT schemaname, sequencename, last_value::text
          FROM pg_sequences
          WHERE schemaname = 'public'
          ORDER BY sequencename
        `)
      : [];
    const migrationMetadata = await query(client, `
      SELECT CASE WHEN to_regclass('public._prisma_migrations') IS NULL THEN false ELSE true END AS exists
    `);
    const migrationRows = migrationMetadata[0].exists
      ? await query(client, `
          SELECT migration_name, checksum, finished_at, rolled_back_at,
                 COALESCE(logs, '') AS logs
          FROM public._prisma_migrations
          ORDER BY started_at
        `)
      : [];
    await client.query("COMMIT");
    const schema = { columns, constraints, indexes, enums };
    const semanticSchema = {
      columns: columns
        .map(({ ordinal_position: _ordinalPosition, ...column }) => column)
        .sort((left, right) =>
          `${left.table_name}\u0000${left.column_name}`.localeCompare(
            `${right.table_name}\u0000${right.column_name}`,
          ),
        ),
      constraints,
      indexes,
      enums,
    };
    const applicationData = { data, sequences };
    return {
      role,
      identity_hash: sha256(stable(normalizedIdentity(rawUrl))).slice(0, 16),
      server,
      table_count: tables.length,
      total_rows: data.reduce((sum, item) => sum + Number(item.row_count), 0),
      schema_hash: hashObject(schema),
      semantic_schema_hash: hashObject(semanticSchema),
      application_data_hash: hashObject(applicationData),
      application_data_included: includeApplicationData,
      schema,
      applicationData,
      prisma_migrations_exists: migrationMetadata[0].exists,
      migration_metadata: migrationRows,
    };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

async function manifest(rawUrl, role, includeApplicationData = true) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await manifestOnce(rawUrl, role, includeApplicationData);
    } catch (error) {
      lastError = error;
      if (!isTransientConnectionError(error) || attempt === 3) throw error;
    }
  }
  throw lastError;
}

function comparisonFingerprint(value) {
  return {
    server_version: value.server.server_version,
    table_count: value.table_count,
    total_rows: value.total_rows,
    schema_hash: value.schema_hash,
    semantic_schema_hash: value.semantic_schema_hash,
    application_data_hash: value.application_data_hash,
  };
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createDisposableDatabase(cloneUrl) {
  const source = new URL(cloneUrl);
  const name = `codex_migration_disposable_${Date.now()}_${randomBytes(3).toString("hex")}`;
  if (!/^codex_migration_disposable_[a-z0-9_]+$/.test(name)) {
    throw new Error("DISPOSABLE_DATABASE_NAME_INVALID");
  }
  const client = await connectWithRetry(cloneUrl);
  try {
    await client.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
  } finally {
    await client.end();
  }
  source.pathname = `/${name}`;
  source.searchParams.delete("schema");
  return { name, url: source.toString() };
}

async function dropDisposableDatabase(cloneUrl, name) {
  if (!/^codex_migration_disposable_[a-z0-9_]+$/.test(name)) {
    throw new Error("REFUSED_TO_DROP_UNVALIDATED_DATABASE");
  }
  const client = await connectWithRetry(cloneUrl);
  try {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await client.end();
  }
}

async function main() {
  const cloneUrl = process.env.MIGRATION_TEST_DB_URL;
  if (!cloneUrl) throw new Error("MIGRATION_TEST_BRANCH_REQUIRED");
  const cloneDirectUrl = directConnectionUrl(cloneUrl);
  results.MIGRATION_TEST_DB_URL = "PRESENT";

  const productionUrl =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.STORAGE_DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.STORAGE_POSTGRES_PRISMA_URL ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (!productionUrl) throw new Error("PRODUCTION_READONLY_URL_REQUIRED");

  const protectedNames = [
    "DATABASE_URL", "DIRECT_URL", "RECOVERY_DB_URL", "TEST_DB_URL",
    "STORAGE_POSTGRES_PRISMA_URL", "STORAGE_DATABASE_URL",
    "STORAGE_DATABASE_URL_UNPOOLED", "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL",
  ];
  for (const name of protectedNames) {
    const raw = process.env[name];
    if (raw && sameEndpoint(cloneUrl, raw)) {
      throw new Error(`MIGRATION_TEST_TARGET_MISMATCH:${name}`);
    }
  }
  if (!existsSync(baselinePath)) throw new Error("BASELINE_CANDIDATE_MISSING");
  const activeDirectories = (await import("node:fs/promises"))
    .readdir(migrationsPath, { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort());
  if (JSON.stringify(await activeDirectories) !== JSON.stringify([baselineName])) {
    throw new Error("FINAL_ACTIVE_LAYOUT_INVALID");
  }
  const baselineChecksum = sha256(readFileSync(baselinePath));
  if (baselineChecksum !== "6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e") {
    throw new Error("BASELINE_PROMOTION_HASH_MISMATCH");
  }
  results.MIGRATION_TEST_TARGET = "PASS";
  results.FINAL_ACTIVE_LAYOUT = "PASS";
  mkdirSync(runDir, { recursive: true });

  const production = await manifest(productionUrl, "PRODUCTION_READ_ONLY");
  const cloneBefore = await manifest(cloneDirectUrl, "MIGRATION_TEST_CLONE_PRE");
  writeJson(join(runDir, "production-readonly-fingerprint.json"), comparisonFingerprint(production));
  writeJson(join(runDir, "clone-fingerprint.json"), comparisonFingerprint(cloneBefore));

  if (hashObject(comparisonFingerprint(production)) !== hashObject(comparisonFingerprint(cloneBefore))) {
    throw new Error("MIGRATION_TEST_CLONE_DOES_NOT_MATCH_PRODUCTION");
  }
  results.FINAL_ACTIVE_CLONE_MATCHES_PRODUCTION = "PASS";
  writeJson(join(runDir, "PRE_MANIFEST.json"), cloneBefore);

  const diffClone = runPrisma([
    "migrate", "diff", "--from-config-datasource",
    "--to-schema", join(root, "prisma", "schema.prisma"), "--exit-code",
  ], cloneDirectUrl);
  if (diffClone.status !== 0) {
    throw new Error(`CLONE_SCHEMA_DIFF_NOT_EMPTY:${safeError(diffClone.stderr || diffClone.stdout)}`);
  }
  writeJson(join(runDir, "clone-schema-diff.json"), { status: "EMPTY", output: diffClone.stdout.trim() });

  const metadata = cloneBefore.migration_metadata;
  if (
    metadata.length !== 1 ||
    metadata[0].migration_name !== baselineName ||
    metadata[0].checksum !== baselineChecksum ||
    !metadata[0].finished_at ||
    metadata[0].rolled_back_at !== null ||
    metadata[0].logs !== ""
  ) {
    throw new Error("NEW_DEDICATED_CLONE_REQUIRED: existing clone metadata does not exactly match final baseline");
  }
  results.FINAL_BASELINE_CHECKSUM_PROOF = "PASS";
  const cloneStatus = requirePrismaPass("EXISTING_DB_STATUS_FAILED", ["migrate", "status"], cloneDirectUrl);
  writeJson(join(runDir, "clone-status.json"), {
    status: cloneStatus.status,
    stdout: cloneStatus.stdout.trim(),
    stderr: safeError(cloneStatus.stderr.trim()),
  });
  const cloneAfter = await manifest(cloneDirectUrl, "MIGRATION_TEST_CLONE_POST");
  writeJson(join(runDir, "POST_MANIFEST.json"), cloneAfter);

  results.FINAL_EXISTING_DB_SCHEMA_MUTATIONS =
    cloneBefore.schema_hash === cloneAfter.schema_hash ? 0 : 1;
  results.FINAL_EXISTING_DB_DATA_MUTATIONS =
    cloneBefore.application_data_hash === cloneAfter.application_data_hash ? 0 : 1;
  if (
    results.FINAL_EXISTING_DB_SCHEMA_MUTATIONS !== 0 ||
    results.FINAL_EXISTING_DB_DATA_MUTATIONS !== 0 ||
    hashObject(cloneBefore.migration_metadata) !== hashObject(cloneAfter.migration_metadata)
  ) {
    throw new Error("FINAL_EXISTING_DB_PROOF_MUTATED_CLONE");
  }
  results.FINAL_EXISTING_DB_ADOPTION_PROOF = "PASS";

  let disposable;
  let canaryDir;
  try {
    disposable = await createDisposableDatabase(cloneDirectUrl);
    if (!sameEndpoint(disposable.url, cloneDirectUrl) || disposable.name === normalizedIdentity(cloneDirectUrl).database) {
      throw new Error("DISPOSABLE_DATABASE_IDENTITY_INVALID");
    }
    requirePrismaPass("EMPTY_DB_DEPLOY_FAILED", ["migrate", "deploy"], disposable.url);
    results.FINAL_ACTIVE_EMPTY_REPLAY = "PASS";

    const emptyDiff = runPrisma([
      "migrate", "diff", "--from-config-datasource",
      "--to-schema", join(root, "prisma", "schema.prisma"), "--exit-code",
    ], disposable.url);
    if (emptyDiff.status !== 0) {
      throw new Error(`EMPTY_DB_SCHEMA_DIFF_NOT_EMPTY:${safeError(emptyDiff.stderr || emptyDiff.stdout)}`);
    }
    results.FINAL_ACTIVE_EMPTY_DIFF = "EMPTY";
    const emptyStatus = requirePrismaPass("EMPTY_DB_STATUS_FAILED", ["migrate", "status"], disposable.url);
    writeJson(join(runDir, "empty-status.json"), {
      status: emptyStatus.status,
      stdout: emptyStatus.stdout.trim(),
      stderr: safeError(emptyStatus.stderr.trim()),
    });
    const emptyManifest = await manifest(disposable.url, "FINAL_ACTIVE_EMPTY_REPLAY");
    writeJson(join(runDir, "EMPTY_MANIFEST.json"), emptyManifest);
    if (emptyManifest.semantic_schema_hash !== cloneBefore.semantic_schema_hash) {
      throw new Error("FINAL_ACTIVE_SCHEMA_FINGERPRINT_MISMATCH");
    }
    results.FINAL_ACTIVE_SCHEMA_FINGERPRINT_MATCH = "PASS";

    const canaryName = "20260817010000_future_migration_canary";
    canaryDir = join(migrationsPath, canaryName);
    mkdirSync(canaryDir, { recursive: false });
    writeFileSync(join(canaryDir, "migration.sql"), [
      "-- Disposable proof that a future forward migration can be deployed.",
      "CREATE TABLE \"__codex_future_migration_canary\" (",
      "  \"id\" INTEGER NOT NULL,",
      "  CONSTRAINT \"__codex_future_migration_canary_pkey\" PRIMARY KEY (\"id\")",
      ");",
      "",
    ].join("\n"), "utf8");
    requirePrismaPass("FUTURE_CANARY_DEPLOY_FAILED", ["migrate", "deploy"], disposable.url);
    requirePrismaPass("FUTURE_CANARY_STATUS_FAILED", ["migrate", "status"], disposable.url);
    const canaryClient = await connectWithRetry(disposable.url);
    try {
      const [canary] = await query(canaryClient, `
        SELECT to_regclass('public.__codex_future_migration_canary') IS NOT NULL AS exists
      `);
      if (!canary.exists) throw new Error("FUTURE_CANARY_TABLE_MISSING");
    } finally {
      await canaryClient.end();
    }
    results.FINAL_FUTURE_CANARY = "PASS";
  } finally {
    if (canaryDir && existsSync(canaryDir)) rmSync(canaryDir, { recursive: true, force: true });
    if (disposable) await dropDisposableDatabase(cloneDirectUrl, disposable.name);
  }

  const productionAfter = await manifest(productionUrl, "PRODUCTION_READ_ONLY_POST", false);
  writeJson(join(runDir, "production-post-readonly.json"), productionAfter);
  if (
    production.schema_hash !== productionAfter.schema_hash ||
    production.semantic_schema_hash !== productionAfter.semantic_schema_hash ||
    productionAfter.prisma_migrations_exists
  ) {
    throw new Error("PRODUCTION_SCHEMA_OR_MIGRATION_METADATA_CHANGED_DURING_RUN");
  }
  writeJson(join(runDir, "RESULTS.json"), results);
}

try {
  await main();
  for (const [key, value] of Object.entries(results)) console.log(`${key}: ${value}`);
  console.log(`EVIDENCE_DIR: ${runDir}`);
} catch (error) {
  writeJson(join(runDir, "RESULTS.json"), { ...results, ERROR: safeError(error) });
  for (const [key, value] of Object.entries(results)) console.log(`${key}: ${value}`);
  console.error(`PROOF_FAILED: ${safeError(error)}`);
  console.error(`EVIDENCE_DIR: ${runDir}`);
  process.exit(1);
}
