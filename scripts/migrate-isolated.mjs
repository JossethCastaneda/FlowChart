#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config } from "dotenv";

for (const path of [".env", ".env.local"]) {
  if (existsSync(path)) config({ path, override: false, quiet: true });
}

const migrationUrl = process.env.MIGRATION_TEST_DB_URL;
if (!migrationUrl) {
  console.error("MIGRATION_TEST_BRANCH_REQUIRED");
  process.exit(1);
}

function identity(raw) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase().replace(/-pooler(?=\.)/, "");
  const schema = url.searchParams.get("schema") || "public";
  return { host, database: url.pathname, schema };
}

let migrationIdentity;
try {
  migrationIdentity = identity(migrationUrl);
} catch {
  console.error("MIGRATION_TEST_TARGET_INVALID");
  process.exit(1);
}

const protectedNames = [
  "DATABASE_URL",
  "DIRECT_URL",
  "RECOVERY_DB_URL",
  "TEST_DB_URL",
  "STORAGE_POSTGRES_PRISMA_URL",
  "STORAGE_DATABASE_URL",
  "STORAGE_DATABASE_URL_UNPOOLED",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
];

for (const name of protectedNames) {
  const raw = process.env[name];
  if (!raw) continue;
  try {
    const protectedIdentity = identity(raw);
    // Another database name on a protected Neon endpoint still belongs to the
    // protected branch; migration experiments require a distinct clone host.
    if (protectedIdentity.host === migrationIdentity.host) {
      console.error(`MIGRATION_TEST_TARGET_MISMATCH: matches ${name}`);
      process.exit(1);
    }
  } catch {
    console.error(`MIGRATION_TEST_TARGET_INVALID: cannot classify ${name}`);
    process.exit(1);
  }
}

const [action, ...args] = process.argv.slice(2);
if (action === "check-target") {
  console.log("MIGRATION_TEST_TARGET_OK");
  process.exit(0);
}

const allowedActions = new Set(["status", "dev", "deploy", "resolve"]);
if (!action || !allowedActions.has(action)) {
  console.error("MIGRATION_TEST_ACTION_REQUIRED: status|dev|deploy|resolve");
  process.exit(1);
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["prisma", "migrate", action, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: migrationUrl,
    DIRECT_URL: migrationUrl,
  },
});

if (result.error) {
  console.error(`MIGRATION_TEST_EXECUTION_FAILED: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
