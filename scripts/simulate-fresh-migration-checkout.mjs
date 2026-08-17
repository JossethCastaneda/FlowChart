#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
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
const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const evidenceDir = join(root, ".tmp", "canonical-migration-fresh-checkout", runId);
const simulationRoot = join(evidenceDir, "checkout");
const baselineName = "20260817000000_canonical_baseline";
const expectedHash = "6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e";

const results = {
  FRESH_CHECKOUT_SOURCE_INVENTORY: "FAIL",
  FRESH_CHECKOUT_NO_TMP_DEPENDENCY: "FAIL",
  FRESH_CHECKOUT_PRISMA_VALIDATE: "NOT_RUN",
  FRESH_CHECKOUT_EMPTY_REPLAY: "NOT_RUN",
  FRESH_CHECKOUT_MIGRATE_STATUS: "NOT_RUN",
  FRESH_CHECKOUT_SCHEMA_DIFF: "NOT_RUN",
  FRESH_CHECKOUT_REPRODUCIBLE: "FAIL",
  PRODUCTION_MUTATIONS_THIS_RUN: 0,
};

function normalizedHost(raw) {
  return new URL(raw).hostname.toLowerCase().replace(/-pooler(?=\.)/, "");
}

function directUrl(raw) {
  const url = new URL(raw);
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  return url.toString();
}

function safeError(error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const [name, value] of Object.entries(process.env)) {
    if (/(URL|PASSWORD|SECRET|TOKEN|KEY)/i.test(name) && value && value.length >= 8) {
      message = message.replaceAll(value, `[${name}]`);
    }
  }
  return message.replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]");
}

function isTransient(error) {
  return /(P1001|Authentication timed out|ECONNRESET|ETIMEDOUT|timeout)/i.test(safeError(error));
}

async function connectWithRetry(connectionString) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const client = new Client({ connectionString });
    client.on("error", () => {});
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try { await client.end(); } catch {}
      if (!isTransient(error)) throw error;
    }
  }
  throw lastError;
}

function runPrisma(args, databaseUrl) {
  const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");
  const configPath = join(simulationRoot, "prisma.config.ts");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = spawnSync(process.execPath, [prismaCli, ...args, "--config", configPath], {
      cwd: simulationRoot,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    });
    const normalized = {
      status: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || result.error?.message || "",
    };
    if (normalized.status === 0 || !isTransient(`${normalized.stderr}\n${normalized.stdout}`) || attempt === 3) {
      return normalized;
    }
  }
  throw new Error("UNREACHABLE_PRISMA_RETRY_STATE");
}

function requirePass(label, args, databaseUrl) {
  const result = runPrisma(args, databaseUrl);
  if (result.status !== 0) throw new Error(`${label}:${safeError(result.stderr || result.stdout)}`);
  return result;
}

async function createDatabase(adminUrl) {
  const name = `codex_fresh_checkout_${Date.now()}_${randomBytes(3).toString("hex")}`;
  if (!/^codex_fresh_checkout_[a-z0-9_]+$/.test(name)) throw new Error("INVALID_DISPOSABLE_NAME");
  const client = await connectWithRetry(adminUrl);
  try {
    await client.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
  } finally {
    await client.end();
  }
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  url.searchParams.delete("schema");
  return { name, url: url.toString() };
}

async function dropDatabase(adminUrl, name) {
  if (!/^codex_fresh_checkout_[a-z0-9_]+$/.test(name)) throw new Error("REFUSED_DISPOSABLE_DROP");
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const client = await connectWithRetry(adminUrl);
    try {
      await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      return;
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === 3) throw error;
    } finally {
      try { await client.end(); } catch {}
    }
  }
  throw lastError;
}

function writeResults(extra = {}) {
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, "RESULTS.json"), `${JSON.stringify({ ...results, ...extra }, null, 2)}\n`);
}

let disposable;
try {
  const migrationUrl = process.env.MIGRATION_TEST_DB_URL;
  if (!migrationUrl) throw new Error("MIGRATION_TEST_BRANCH_REQUIRED");
  for (const name of [
    "DATABASE_URL", "DIRECT_URL", "RECOVERY_DB_URL", "TEST_DB_URL",
    "STORAGE_POSTGRES_PRISMA_URL", "STORAGE_DATABASE_URL",
    "STORAGE_DATABASE_URL_UNPOOLED", "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL",
  ]) {
    const protectedUrl = process.env[name];
    if (protectedUrl && normalizedHost(protectedUrl) === normalizedHost(migrationUrl)) {
      throw new Error(`MIGRATION_TEST_TARGET_MISMATCH:${name}`);
    }
  }

  mkdirSync(simulationRoot, { recursive: true });
  cpSync(join(root, "prisma"), join(simulationRoot, "prisma"), { recursive: true });
  for (const file of ["prisma.config.ts", "package.json", "package-lock.json"]) {
    if (existsSync(join(root, file))) cpSync(join(root, file), join(simulationRoot, file));
  }
  symlinkSync(join(root, "node_modules"), join(simulationRoot, "node_modules"), "junction");

  const migrationDirs = readdirSync(join(simulationRoot, "prisma", "migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const baselinePath = join(simulationRoot, "prisma", "migrations", baselineName, "migration.sql");
  const hash = createHash("sha256").update(readFileSync(baselinePath)).digest("hex");
  if (JSON.stringify(migrationDirs) !== JSON.stringify([baselineName]) || hash !== expectedHash) {
    throw new Error("FRESH_CHECKOUT_SOURCE_INVENTORY_INVALID");
  }
  results.FRESH_CHECKOUT_SOURCE_INVENTORY = "PASS";

  const sourceText = [
    readFileSync(join(simulationRoot, "prisma.config.ts"), "utf8"),
    readFileSync(join(simulationRoot, "prisma", "schema.prisma"), "utf8"),
    readFileSync(baselinePath, "utf8"),
  ].join("\n");
  if (/\.tmp[\\/]migration-baseline-lab|canonical-migration-final-proof/i.test(sourceText)) {
    throw new Error("FRESH_CHECKOUT_DEPENDS_ON_TMP_PROOF");
  }
  results.FRESH_CHECKOUT_NO_TMP_DEPENDENCY = "PASS";

  const adminUrl = directUrl(migrationUrl);
  disposable = await createDatabase(adminUrl);
  requirePass("FRESH_VALIDATE_FAILED", ["validate"], disposable.url);
  results.FRESH_CHECKOUT_PRISMA_VALIDATE = "PASS";
  requirePass("FRESH_DEPLOY_FAILED", ["migrate", "deploy"], disposable.url);
  results.FRESH_CHECKOUT_EMPTY_REPLAY = "PASS";
  requirePass("FRESH_STATUS_FAILED", ["migrate", "status"], disposable.url);
  results.FRESH_CHECKOUT_MIGRATE_STATUS = "PASS";
  requirePass("FRESH_DIFF_FAILED", [
    "migrate", "diff", "--from-config-datasource",
    "--to-schema", join(simulationRoot, "prisma", "schema.prisma"), "--exit-code",
  ], disposable.url);
  results.FRESH_CHECKOUT_SCHEMA_DIFF = "EMPTY";
  results.FRESH_CHECKOUT_REPRODUCIBLE = "PASS";
  writeResults({ ACTIVE_MIGRATIONS: migrationDirs, BASELINE_SHA256: hash });
} catch (error) {
  writeResults({ ERROR: safeError(error) });
  console.error(`FRESH_CHECKOUT_FAILED: ${safeError(error)}`);
  process.exitCode = 1;
} finally {
  if (disposable) {
    await dropDatabase(directUrl(process.env.MIGRATION_TEST_DB_URL), disposable.name);
  }
  if (existsSync(simulationRoot)) rmSync(simulationRoot, { recursive: true, force: true });
}

for (const [key, value] of Object.entries(results)) console.log(`${key}: ${value}`);
console.log(`EVIDENCE_DIR: ${evidenceDir}`);
