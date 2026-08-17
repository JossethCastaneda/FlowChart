import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HISTORICAL_LEGACY_AIUSAGE_VECTORS,
  LEGACY_AIUSAGE_RECOVERY_QUERY,
  canonicalLegacyAiUsageHash,
  canonicalLegacyAiUsageJson,
} from "@/lib/architecture/legacy-aiusage-recovery";

const sha256Utf8 = (value: string) =>
  createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");

describe("canonical legacy AiUsage recovery hash", () => {
  const input = { id: "synthetic-id", estimatedCostUsdText: "0.123" };
  const canonicalJson =
    '{"id":"synthetic-id","estimatedCostUsd":"0.123"}';
  const canonicalHash =
    "4acd27bd9d5c005f1ce499b534639171eda169631203380642c71a39598fc0cd";

  it("keeps PostgreSQL text as a JSON string in deterministic key order", () => {
    expect(canonicalLegacyAiUsageJson(input)).toBe(canonicalJson);
    expect(canonicalLegacyAiUsageHash(input)).toBe(canonicalHash);
    expect(canonicalLegacyAiUsageHash(input)).toBe(sha256Utf8(canonicalJson));
  });

  it("distinguishes canonical string JSON from the incorrect numeric JSON", () => {
    const numericJson = JSON.stringify({
      id: input.id,
      estimatedCostUsd: 0.123,
    });

    expect(numericJson).toBe(
      '{"id":"synthetic-id","estimatedCostUsd":0.123}',
    );
    expect(sha256Utf8(numericJson)).toBe(
      "e5d0c5112b990691c6f1af88d74a201e8b700cacb286416ec6f82444ef4a1989",
    );
    expect(canonicalLegacyAiUsageHash(input)).not.toBe(sha256Utf8(numericJson));
  });

  it("rejects Number input instead of silently coercing it", () => {
    expect(() =>
      canonicalLegacyAiUsageHash({
        id: input.id,
        estimatedCostUsdText: 0.123,
      }),
    ).toThrow(/PostgreSQL text/);
  });

  it("does not append a newline and hashes UTF-8 bytes explicitly", () => {
    expect(canonicalLegacyAiUsageHash(input)).not.toBe(
      sha256Utf8(`${canonicalJson}\n`),
    );

    const utf8Input = { id: "sintético-ñ", estimatedCostUsdText: "0.123" };
    expect(canonicalLegacyAiUsageHash(utf8Input)).toBe(
      "ddf864eeffd58a6331b937fb35a50acf3e91e8a8d2243250f78188bb31cd93fd",
    );
  });

  it("pins only opaque historical vectors and the explicit SQL text cast", () => {
    expect(HISTORICAL_LEGACY_AIUSAGE_VECTORS).toEqual([
      {
        idHashPrefix: "6e88496a71d5",
        canonicalHash:
          "410549b6df2c8c04a0d85b784228ba43e0ae903622cba8bf89f616b009f4b898",
      },
      {
        idHashPrefix: "989dce993460",
        canonicalHash:
          "40135c346cb613f1fa3c34a3e575b76291edc83cb861b7c5264f2481a3def874",
      },
    ]);
    expect(LEGACY_AIUSAGE_RECOVERY_QUERY).toContain(
      '"estimatedCostUsd"::text AS "estimatedCostUsdText"',
    );
  });

  it("keeps the tracked verifier read-only and free of numeric coercion", () => {
    const verifier = readFileSync(
      "scripts/verify-legacy-aiusage-recovery.ts",
      "utf8",
    );
    expect(verifier).toContain(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    expect(verifier).toContain("LEGACY_AIUSAGE_RECOVERY_QUERY");
    expect(verifier).toContain('await client.query("ROLLBACK")');
    expect(verifier).not.toMatch(/parseFloat\s*\(/);
    expect(verifier).not.toMatch(/Number\s*\(/);
  });
});
