import { describe, it, expect } from "vitest";
import {
  CampaignUpdateSchema,
  AdsetUpdateSchema,
  BulkActionSchema,
  CampaignCreateSchema,
  AdsetCreateSchema,
  RuleCreateSchema,
  RuleUpdateSchema,
} from "../lib/ads-schemas";

describe("ads-schemas — escrituras estrictas", () => {
  it("rechaza escrituras sin confirmed_by_user", () => {
    expect(CampaignUpdateSchema.safeParse({ campaignId: "123", status: "PAUSED" }).success).toBe(false);
    expect(BulkActionSchema.safeParse({ action: "pause", ids: ["123"] }).success).toBe(false);
    expect(RuleCreateSchema.safeParse({
      adAccountId: "act_1",
      name: "r",
      evaluation_spec: { evaluation_type: "SCHEDULE", filters: [{ field: "spent", value: 1, operator: "GREATER_THAN" }] },
      execution_spec: { execution_type: "PAUSE" },
    }).success).toBe(false);
  });

  it("acepta una actualización válida de campaña", () => {
    const r = CampaignUpdateSchema.safeParse({
      campaignId: "120210000000",
      status: "PAUSED",
      daily_budget: 250,
      confirmed_by_user: true,
    });
    expect(r.success).toBe(true);
  });

  it("rechaza status fuera del enum y IDs no numéricos", () => {
    expect(CampaignUpdateSchema.safeParse({ campaignId: "abc", status: "PAUSED", confirmed_by_user: true }).success).toBe(false);
    expect(CampaignUpdateSchema.safeParse({ campaignId: "123", status: "RUNNING", confirmed_by_user: true }).success).toBe(false);
  });

  it("bulk: máximo 100 ids y acción del catálogo", () => {
    const manyIds = Array.from({ length: 101 }, (_, i) => String(i + 1));
    expect(BulkActionSchema.safeParse({ action: "pause", ids: manyIds, confirmed_by_user: true }).success).toBe(false);
    expect(BulkActionSchema.safeParse({ action: "nuke", ids: ["1"], confirmed_by_user: true }).success).toBe(false);
    expect(BulkActionSchema.safeParse({ action: "duplicate", ids: ["1", "2"], level: "campaigns", confirmed_by_user: true }).success).toBe(true);
  });

  it("creación de campaña exige objetivo ODAX válido", () => {
    expect(CampaignCreateSchema.safeParse({
      adAccountId: "act_99", name: "Test", objective: "LINK_CLICKS", confirmed_by_user: true,
    }).success).toBe(false);
    expect(CampaignCreateSchema.safeParse({
      adAccountId: "99", name: "Test", objective: "OUTCOME_SALES", confirmed_by_user: true,
    }).success).toBe(true);
  });

  it("creación de adset valida países ISO y edades", () => {
    expect(AdsetCreateSchema.safeParse({
      adAccountId: "1", campaignId: "2", objective: "OUTCOME_TRAFFIC", name: "A",
      countries: ["MEX"], confirmed_by_user: true,
    }).success).toBe(false);
    expect(AdsetCreateSchema.safeParse({
      adAccountId: "1", campaignId: "2", objective: "OUTCOME_TRAFFIC", name: "A",
      countries: ["MX", "us"], ageMin: 18, ageMax: 65, confirmed_by_user: true,
    }).success).toBe(true);
  });

  it("adset update: targeting debe ser objeto, nunca string", () => {
    expect(AdsetUpdateSchema.safeParse({
      adsetId: "1", targeting: "{}", confirmed_by_user: true,
    }).success).toBe(false);
    expect(AdsetUpdateSchema.safeParse({
      adsetId: "1", targeting: { geo_locations: { countries: ["MX"] } }, confirmed_by_user: true,
    }).success).toBe(true);
  });

  it("reglas: execution_type y schedule_type del catálogo oficial", () => {
    const base = {
      adAccountId: "act_1",
      name: "Pausar CPC alto",
      evaluation_spec: {
        evaluation_type: "SCHEDULE",
        filters: [
          { field: "entity_type", value: "CAMPAIGN", operator: "EQUAL" },
          { field: "time_preset", value: "LAST_7_DAYS", operator: "EQUAL" },
          { field: "cpc", value: 5000, operator: "GREATER_THAN" },
        ],
      },
      schedule_spec: { schedule_type: "DAILY" },
      confirmed_by_user: true,
    };
    expect(RuleCreateSchema.safeParse({ ...base, execution_spec: { execution_type: "PAUSE" } }).success).toBe(true);
    // PAUSE_CAMPAIGN / SEND_NOTIFICATION no existen en la API
    expect(RuleCreateSchema.safeParse({ ...base, execution_spec: { execution_type: "PAUSE_CAMPAIGN" } }).success).toBe(false);
    expect(RuleCreateSchema.safeParse({
      ...base,
      execution_spec: { execution_type: "PAUSE" },
      schedule_spec: { schedule_type: "WEEKLY" },
    }).success).toBe(false);
  });

  it("update de regla exige confirmación incluso para toggle de status", () => {
    expect(RuleUpdateSchema.safeParse({ status: "DISABLED" }).success).toBe(false);
    expect(RuleUpdateSchema.safeParse({ status: "DISABLED", confirmed_by_user: true }).success).toBe(true);
  });
});
