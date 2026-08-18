#!/usr/bin/env tsx

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import {
  HISTORICAL_LEGACY_AIUSAGE_VECTORS,
  LEGACY_AIUSAGE_RECOVERY_QUERY,
  canonicalLegacyAiUsageHash,
  sanitizedLegacyAiUsageId,
} from "../lib/architecture/legacy-aiusage-recovery";

if (existsSync(".env")) {
  loadEnv({ path: ".env", override: false, quiet: true });
}

const EXPECTED_RECOVERY_IDENTITY = "ad7b5afac18841ed";

function sha256(value: string): string {
  return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

function recoveryIdentity(raw: string): string {
  const url = new URL(raw);
  const host = url.hostname.replace("-pooler", "");
  const database = url.pathname.replace(/^\//, "");
  const schema = url.searchParams.get("schema") || "public";
  const options = url.searchParams.get("options") || "";
  return sha256([host, database, schema, options].join("|")).slice(0, 16);
}

function safeError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const [name, value] of Object.entries(process.env)) {
    if (!/(URL|PASSWORD|SECRET|TOKEN|KEY)/i.test(name)) continue;
    if (value && value.length >= 8) message = message.replaceAll(value, `[${name}]`);
  }
  return message
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]")
    .replaceAll(/[a-z0-9-]+\.(?:aws\.)?neon\.tech/gi, "[DATABASE_HOST_REDACTED]");
}

async function verify(): Promise<void> {
  if (process.argv.includes("--check-contract")) {
    if (!LEGACY_AIUSAGE_RECOVERY_QUERY.includes('"estimatedCostUsd"::text')) {
      throw new Error("RECOVERY_QUERY_TEXT_CAST_MISSING");
    }
    console.log("RECOVERY_HASH_CONTRACT_OK");
    return;
  }

  const connectionString = process.env.RECOVERY_DB_URL;
  if (!connectionString) throw new Error("RECOVERY_DB_URL_REQUIRED");

  const identity = recoveryIdentity(connectionString);
  if (identity !== EXPECTED_RECOVERY_IDENTITY) {
    throw new Error("RECOVERY_TARGET_IDENTITY_MISMATCH");
  }

  const client = new Client({
    connectionString,
    application_name: "flowchart_legacy_hash_verifier_readonly",
  });

  await client.connect();
  try {
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const readOnly = await client.query<{ transaction_read_only: string }>(
      "SHOW transaction_read_only",
    );
    if (readOnly.rows[0]?.transaction_read_only !== "on") {
      throw new Error("RECOVERY_TRANSACTION_NOT_READ_ONLY");
    }

    const column = await client.query<{
      data_type: string;
      udt_name: string;
      is_nullable: string;
    }>(`
      SELECT data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'AiUsage'
        AND column_name = 'estimatedCostUsd'
    `);
    if (column.rows.length !== 1) {
      throw new Error("RECOVERY_ESTIMATED_COST_COLUMN_MISSING");
    }

    const result = await client.query<{
      id: unknown;
      estimatedCostUsdText: unknown;
    }>(LEGACY_AIUSAGE_RECOVERY_QUERY);

    const expected = new Map(
      HISTORICAL_LEGACY_AIUSAGE_VECTORS.map((vector) => [
        vector.idHashPrefix,
        vector.canonicalHash,
      ]),
    );
    const rows = result.rows.map((row) => {
      const idHashPrefix = sanitizedLegacyAiUsageId(row.id);
      const canonicalHash = canonicalLegacyAiUsageHash({
        id: row.id,
        estimatedCostUsdText: row.estimatedCostUsdText,
      });
      return {
        idHashPrefix,
        legacyValueNonNull: row.estimatedCostUsdText !== null,
        hashMatch: expected.get(idHashPrefix) === canonicalHash,
      };
    });

    const pass =
      rows.length === HISTORICAL_LEGACY_AIUSAGE_VECTORS.length &&
      rows.every((row) => row.legacyValueNonNull && row.hashMatch) &&
      rows.every((row) => expected.has(row.idHashPrefix));

    console.log(
      JSON.stringify(
        {
          RECOVERY_IDENTITY_MATCH: "PASS",
          RECOVERY_TRANSACTION_READ_ONLY: "PASS",
          RECOVERY_AIUSAGE_COUNT: rows.length,
          RECOVERY_ESTIMATED_COST_COLUMN: "PRESENT",
          RECOVERY_ESTIMATED_COST_TYPE: column.rows[0].udt_name,
          RECOVERY_LEGACY_ROWS_NON_NULL: `${rows.filter((row) => row.legacyValueNonNull).length}/${rows.length}`,
          LEGACY_HASH_MATCH_ROW_1: rows[0]?.hashMatch ? "PASS" : "FAIL",
          LEGACY_HASH_MATCH_ROW_2: rows[1]?.hashMatch ? "PASS" : "FAIL",
          AIUSAGE_RECOVERY_STATE: pass ? "PASS" : "FAIL",
          DATABASE_MUTATIONS: 0,
        },
        null,
        2,
      ),
    );

    if (!pass) throw new Error("RECOVERY_EVIDENCE_HASH_MISMATCH");
    await client.query("ROLLBACK");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    await client.end();
  }
}

verify().catch((error) => {
  console.error(`[legacy-aiusage-verifier] ${safeError(error)}`);
  process.exit(1);
});
