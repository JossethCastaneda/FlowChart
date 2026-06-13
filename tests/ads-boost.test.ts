import { describe, it, expect } from "vitest";
import { BoostSchema } from "../lib/ads-schemas";

describe("boost — contrato sin token de cliente", () => {
  const valid = {
    postId: "987654321",
    adAccountId: "act_123456",
    budgetCents: 20000,
    durationDays: 7,
    countries: ["MX", "US"],
    pageId: "111222333",
    confirmed_by_user: true as const,
  };

  it("acepta un boost válido", () => {
    expect(BoostSchema.safeParse(valid).success).toBe(true);
  });

  it("descarta pageToken aunque el cliente lo envíe (nunca llega al handler)", () => {
    const parsed = BoostSchema.parse({ ...valid, pageToken: "EAAB_robado" });
    expect("pageToken" in parsed).toBe(false);
  });

  it("rechaza sin confirmed_by_user", () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.confirmed_by_user;
    expect(BoostSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza presupuestos y duraciones fuera de rango", () => {
    expect(BoostSchema.safeParse({ ...valid, budgetCents: 50 }).success).toBe(false);
    expect(BoostSchema.safeParse({ ...valid, durationDays: 0 }).success).toBe(false);
    expect(BoostSchema.safeParse({ ...valid, durationDays: 365 }).success).toBe(false);
  });

  it("rechaza países que no son ISO-2 e IDs malformados", () => {
    expect(BoostSchema.safeParse({ ...valid, countries: ["MEX"] }).success).toBe(false);
    expect(BoostSchema.safeParse({ ...valid, pageId: "act_99" }).success).toBe(false);
    expect(BoostSchema.safeParse({ ...valid, postId: "<script>" }).success).toBe(false);
  });
});
