import { createHash } from "node:crypto";

export interface LegacyAiUsageHashInput {
  id: unknown;
  estimatedCostUsdText: unknown;
}

export interface HistoricalLegacyAiUsageVector {
  readonly idHashPrefix: string;
  readonly canonicalHash: string;
}

/**
 * Opaque historical evidence. These are sanitized identifiers and precomputed
 * hashes only; no raw AiUsage ID or legacy financial amount is stored here.
 */
export const HISTORICAL_LEGACY_AIUSAGE_VECTORS = Object.freeze<
  readonly HistoricalLegacyAiUsageVector[]
>([
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

/**
 * The cast is part of the evidence specification. It prevents pg, Prisma, or a
 * future driver version from converting the legacy float through JS Number.
 */
export const LEGACY_AIUSAGE_RECOVERY_QUERY = `
  SELECT id,
         "estimatedCostUsd"::text AS "estimatedCostUsdText"
  FROM "AiUsage"
  ORDER BY id
`;

export function canonicalLegacyAiUsageJson(
  input: LegacyAiUsageHashInput,
): string {
  if (typeof input.id !== "string") {
    throw new TypeError("Legacy AiUsage id must be a string");
  }
  if (typeof input.estimatedCostUsdText !== "string") {
    throw new TypeError(
      "Legacy estimatedCostUsd evidence must be PostgreSQL text",
    );
  }

  // Key insertion order is part of the canonical evidence format.
  return JSON.stringify({
    id: input.id,
    estimatedCostUsd: input.estimatedCostUsdText,
  });
}

export function canonicalLegacyAiUsageHash(
  input: LegacyAiUsageHashInput,
): string {
  const canonicalJson = canonicalLegacyAiUsageJson(input);
  return createHash("sha256")
    .update(Buffer.from(canonicalJson, "utf8"))
    .digest("hex");
}

export function sanitizedLegacyAiUsageId(id: unknown): string {
  if (typeof id !== "string") {
    throw new TypeError("Legacy AiUsage id must be a string");
  }
  return createHash("sha256").update(Buffer.from(id, "utf8")).digest("hex").slice(0, 12);
}
