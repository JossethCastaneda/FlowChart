import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Validates that the AiUsage model exists in the Prisma schema with all
 * required fields for metering and billing dashboards.
 *
 * Why a file-based test instead of a runtime test?
 * Because these fields are additive (nullable) and we can't `db push` in CI
 * or during this sanitisation flow. This test ensures the SCHEMA declares
 * everything that `lib/ai/metering.ts` writes.
 */

const SCHEMA_PATH = join(__dirname, "..", "prisma", "schema.prisma");

describe("ai-usage schema", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf8");

  // Extract the AiUsage model block
  const modelMatch = schema.match(/model AiUsage \{[\s\S]*?\n\}/);

  it("AiUsage model exists in prisma schema", () => {
    expect(modelMatch).not.toBeNull();
  });

  const modelBlock = modelMatch?.[0] ?? "";

  const requiredFields = [
    "workspaceId",
    "route",
    "model",
    "tokensIn",
    "tokensOut",
    "provider",
    "estimatedCostUsd",
    "feature",
    "createdAt",
  ];

  for (const field of requiredFields) {
    it(`AiUsage has field: ${field}`, () => {
      expect(modelBlock).toContain(field);
    });
  }

  it("AiUsage has workspaceId index", () => {
    expect(modelBlock).toContain("@@index([workspaceId])");
  });

  it("AiUsage has createdAt index", () => {
    expect(modelBlock).toContain("@@index([createdAt])");
  });

  it("AiUsage has cascade delete via workspace relation", () => {
    expect(modelBlock).toContain("onDelete: Cascade");
  });
});
