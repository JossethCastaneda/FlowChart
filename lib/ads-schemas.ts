import { z } from "zod";

/**
 * Schemas estrictos para TODAS las escrituras de Meta Ads.
 * Reemplazan los z.any() — cada campo se valida por forma y rango antes de
 * tocar la Graph API, y toda escritura exige confirmed_by_user explícito.
 */

export const ConfirmedByUser = z.literal(true, {
  message: "Requiere confirmación explícita del usuario para ejecutar esta acción de escritura.",
});

/** IDs numéricos de Meta (campaign/adset/ad/rule/page) */
export const MetaId = z.string().regex(/^\d+$/, "ID de Meta inválido");
/** Ad account con o sin prefijo act_ */
export const AdAccountId = z.string().regex(/^(act_)?\d+$/, "adAccountId inválido");

export const EntityStatus = z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]);
export const BidStrategy = z.enum([
  "LOWEST_COST_WITHOUT_CAP",
  "LOWEST_COST_WITH_BID_CAP",
  "COST_CAP",
  "LOWEST_COST_WITH_MIN_ROAS",
]);
export const CampaignObjective = z.enum([
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_APP_PROMOTION",
]);
export const SpecialAdCategory = z.enum([
  "HOUSING",
  "EMPLOYMENT",
  "CREDIT",
  "ISSUES_ELECTIONS_POLITICS",
  "FINANCIAL_PRODUCTS_SERVICES",
  "ONLINE_GAMBLING_AND_GAMING",
]);

const EntityName = z.string().trim().min(1).max(300);
/** Montos en unidades de moneda (la ruta multiplica ×100 hacia centavos) */
const Money = z.number().positive().max(100_000_000);

// ── Updates (POST /api/meta/{campaigns,adsets,ads}) ────────────────────────

export const CampaignUpdateSchema = z.object({
  campaignId: MetaId,
  status: EntityStatus.optional(),
  name: EntityName.optional(),
  daily_budget: Money.optional(),
  lifetime_budget: Money.optional(),
  bid_strategy: BidStrategy.optional(),
  special_ad_categories: z.array(SpecialAdCategory).max(6).optional(),
  confirmed_by_user: ConfirmedByUser,
});

export const AdsetUpdateSchema = z.object({
  adsetId: MetaId,
  status: EntityStatus.optional(),
  name: EntityName.optional(),
  daily_budget: Money.optional(),
  lifetime_budget: Money.optional(),
  bid_amount: Money.optional(),
  bid_strategy: BidStrategy.optional(),
  optimization_goal: z.string().regex(/^[A-Z_]+$/).max(60).optional(),
  start_time: z.string().datetime({ offset: true }).optional(),
  end_time: z.string().datetime({ offset: true }).optional(),
  // El targeting de Meta es un objeto grande y versionado; se valida que sea
  // objeto plano (la Graph API valida el contenido) — nunca string ni array.
  targeting: z.record(z.string(), z.unknown()).optional(),
  confirmed_by_user: ConfirmedByUser,
});

export const AdUpdateSchema = z.object({
  adId: MetaId,
  adAccountId: AdAccountId.optional(),
  status: EntityStatus.optional(),
  name: EntityName.optional(),
  creative: z.record(z.string(), z.unknown()).optional(),
  confirmed_by_user: ConfirmedByUser,
});

// ── Bulk actions (POST /api/meta/actions) ──────────────────────────────────

export const BulkActionSchema = z.object({
  action: z.enum(["delete", "duplicate", "archive", "pause", "activate", "rename", "budget_update", "spend_cap"]),
  ids: z.array(MetaId).min(1).max(100),
  level: z.enum(["campaigns", "adsets", "ads"]).optional(),
  adAccountId: AdAccountId.optional(),
  updates: z.array(z.object({
    newName: EntityName.optional(),
    budget: Money.optional(),
    type: z.enum(["daily", "lifetime"]).optional(),
    spend_cap: z.number().int().nonnegative().optional(),
  })).max(100).optional(),
  confirmed_by_user: ConfirmedByUser,
});

// ── Creación ────────────────────────────────────────────────────────────────

export const CampaignCreateSchema = z.object({
  adAccountId: AdAccountId,
  name: EntityName,
  objective: CampaignObjective,
  special_ad_categories: z.array(SpecialAdCategory).max(6).optional(),
  buying_type: z.enum(["AUCTION", "RESERVED"]).optional(),
  daily_budget: Money.optional(),
  lifetime_budget: Money.optional(),
  bid_strategy: BidStrategy.optional(),
  confirmed_by_user: ConfirmedByUser,
});

export const AdsetCreateSchema = z.object({
  adAccountId: AdAccountId,
  campaignId: MetaId,
  objective: z.enum(["OUTCOME_TRAFFIC", "OUTCOME_AWARENESS", "OUTCOME_ENGAGEMENT"]),
  name: EntityName,
  dailyBudget: z.number().nonnegative().max(100_000_000).optional(),
  countries: z.array(z.string().regex(/^[A-Za-z]{2}$/)).max(25).optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  genders: z.array(z.union([z.literal(1), z.literal(2)])).max(2).optional(),
  advantageAudience: z.boolean().optional(),
  advantagePlacements: z.boolean().optional(),
  confirmed_by_user: ConfirmedByUser,
});

// ── Boost (POST /api/ads/boost) ─────────────────────────────────────────────
// NOTA: el page token NO es parte del contrato — se resuelve server-side.
// Zod descarta cualquier campo extra (p.ej. un pageToken enviado por error).

export const BoostSchema = z.object({
  postId: z.string().regex(/^[\d_]+$/, "postId inválido"),
  adAccountId: AdAccountId,
  budgetCents: z.number().int().min(100, "Presupuesto mínimo: $1.00").max(100_000_000),
  durationDays: z.number().int().min(1).max(90),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/i, "Código ISO de 2 letras")).min(1).max(25),
  pageId: z.string().regex(/^\d+$/, "pageId inválido"),
  confirmed_by_user: ConfirmedByUser,
});

// ── Reglas automáticas ──────────────────────────────────────────────────────

const RuleFilter = z.object({
  field: z.string().min(1).max(80),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
  operator: z.enum([
    "GREATER_THAN", "LESS_THAN", "EQUAL", "NOT_EQUAL",
    "IN_RANGE", "NOT_IN_RANGE", "IN", "NOT_IN", "CONTAIN", "NOT_CONTAIN", "ANY", "ALL", "NONE",
  ]),
});

export const RuleEvaluationSpec = z.object({
  evaluation_type: z.enum(["SCHEDULE", "TRIGGER"]),
  filters: z.array(RuleFilter).min(1).max(20),
  trigger: z.record(z.string(), z.unknown()).optional(),
});

export const RuleExecutionSpec = z.object({
  execution_type: z.enum(["PAUSE", "UNPAUSE", "CHANGE_BUDGET", "CHANGE_BID", "NOTIFICATION", "REBALANCE_BUDGET", "ROTATE", "PING_ENDPOINT"]),
  execution_options: z.array(z.object({
    field: z.string().min(1).max(80),
    value: z.unknown(),
    operator: z.literal("EQUAL"),
  })).max(10).optional(),
});

export const RuleScheduleSpec = z.object({
  schedule_type: z.enum(["DAILY", "HOURLY", "SEMI_HOURLY", "CUSTOM"]),
  schedule: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const RuleCreateSchema = z.object({
  adAccountId: AdAccountId,
  name: z.string().trim().min(1).max(100),
  evaluation_spec: RuleEvaluationSpec,
  execution_spec: RuleExecutionSpec,
  schedule_spec: RuleScheduleSpec.optional(),
  filter_spec: z.record(z.string(), z.unknown()).optional(),
  confirmed_by_user: ConfirmedByUser,
});

export const RuleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["ENABLED", "DISABLED"]).optional(),
  evaluation_spec: RuleEvaluationSpec.optional(),
  execution_spec: RuleExecutionSpec.optional(),
  schedule_spec: RuleScheduleSpec.optional(),
  confirmed_by_user: ConfirmedByUser,
});
