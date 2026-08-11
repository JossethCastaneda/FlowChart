import { z } from "zod";

export const ProviderSchema = z.enum(["meta", "google", "tiktok"]);
export const SourceProviderSchema = z.union([ProviderSchema, z.enum(["crm", "listening", "manual"])]);
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/, "Moneda ISO-4217 inválida");
export const TimezoneSchema = z.string().min(1).max(100);
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha YYYY-MM-DD inválida");
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);

export const AdAccountInputSchema = z.object({
  provider: ProviderSchema,
  externalAccountId: z.string().min(1).max(200),
  displayName: z.string().min(1).max(300).optional(),
  currency: CurrencySchema,
  timezone: TimezoneSchema,
  attributionWindow: z.string().min(1).max(100),
  authorized: z.boolean().default(false),
  configuration: z.record(z.string(), JsonValueSchema).optional(),
});

export const CreateOptimizationClientSchema = z.object({
  key: z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9_-]*$/),
  displayName: z.string().trim().min(1).max(200),
  environment: z.enum(["production", "test", "demo", "legacy"]).default("production"),
  defaultCurrency: CurrencySchema,
  timezone: TimezoneSchema,
  projectIds: z.array(z.string().min(1)).max(100).default([]),
  adAccounts: z.array(AdAccountInputSchema).max(100).default([]),
});

export const PolicyOperatorSchema = z.enum(["gte", "lte", "eq", "between"]);
export const PolicyConstraintSchema = z.object({
  metric: z.string().min(1).max(100),
  operator: PolicyOperatorSchema,
  value: z.union([z.number().finite(), z.tuple([z.number().finite(), z.number().finite()])]),
  unit: z.string().max(40).optional(),
  scope: z.record(z.string(), JsonValueSchema).optional(),
});

export const ApprovalPolicySchema = z.object({
  manualOnly: z.literal(true).default(true),
  executionEnabled: z.boolean().default(false),
  requiredRoles: z.array(z.enum(["OWNER", "ADMIN"])).min(1).default(["OWNER"]),
  minimumApprovals: z.number().int().min(1).max(5).default(1),
  highRiskMinimumApprovals: z.number().int().min(1).max(5).default(2),
});

export const CreateObjectiveSchema = z
  .object({
    clientId: z.string().min(1),
    status: z.enum(["draft", "active"]).default("draft"),
    primaryKpi: z.string().min(1).max(100),
    direction: z.enum(["minimize", "maximize", "maintain_above", "maintain_below"]),
    targetValue: z.number().finite(),
    windowType: z.enum(["rolling", "calendar", "fixed"]),
    windowStart: IsoDateTimeSchema.optional(),
    windowEnd: IsoDateTimeSchema.optional(),
    currency: CurrencySchema,
    timezone: TimezoneSchema,
    hardConstraints: z.array(PolicyConstraintSchema).default([]),
    softPreferences: z.array(PolicyConstraintSchema).default([]),
    guardrails: z.array(PolicyConstraintSchema).min(1),
    riskTolerance: z.enum(["conservative", "balanced", "aggressive"]),
    maxChangePctPerCycle: z.number().positive().max(50),
    approvalPolicy: ApprovalPolicySchema,
    effectiveFrom: IsoDateTimeSchema.optional(),
    effectiveTo: IsoDateTimeSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.windowType === "fixed" && (!value.windowStart || !value.windowEnd)) {
      ctx.addIssue({ code: "custom", path: ["windowStart"], message: "Una ventana fija requiere inicio y fin" });
    }
    if (value.windowStart && value.windowEnd && value.windowStart >= value.windowEnd) {
      ctx.addIssue({ code: "custom", path: ["windowEnd"], message: "El fin debe ser posterior al inicio" });
    }
    if (value.effectiveFrom && value.effectiveTo && value.effectiveFrom >= value.effectiveTo) {
      ctx.addIssue({ code: "custom", path: ["effectiveTo"], message: "La vigencia final debe ser posterior" });
    }
  });

export const CanonicalMetricSchema = z.object({
  date: IsoDateSchema,
  provider: ProviderSchema,
  accountId: z.string().min(1).max(200),
  level: z.enum(["account", "campaign", "group", "ad"]),
  entityId: z.string().min(1).max(200),
  campaignId: z.string().max(200).optional(),
  groupId: z.string().max(200).optional(),
  currency: CurrencySchema,
  timezone: TimezoneSchema,
  attributionWindow: z.string().min(1).max(100),
  spend: z.number().finite().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().finite().nonnegative(),
  revenue: z.number().finite().nonnegative(),
  sourceUpdatedAt: IsoDateTimeSchema,
  dimensions: z.record(z.string(), JsonValueSchema).optional(),
});

export const SourceManifestSchema = z.object({
  provider: SourceProviderSchema,
  sourceId: z.string().min(1).max(200),
  accountId: z.string().min(1).max(200).optional(),
  syncedAt: IsoDateTimeSchema,
  watermark: z.string().max(300).optional(),
  requestId: z.string().max(300).optional(),
}).superRefine((source, ctx) => {
  if (["meta", "google", "tiktok"].includes(source.provider) && !source.accountId) {
    ctx.addIssue({ code: "custom", path: ["accountId"], message: "Una fuente publicitaria requiere accountId" });
  }
});

export const ModelManifestSchema = z.object({
  analysisType: z.enum(["mmm", "forecast", "listening", "quality"]),
  provider: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  version: z.string().min(1).max(100),
  trainingCutoff: IsoDateTimeSchema.optional(),
});

export const CreateSnapshotSchema = z
  .object({
    clientId: z.string().min(1),
    schemaVersion: z.string().min(1).max(30).default("1.0.0"),
    period: z.object({ from: IsoDateSchema, to: IsoDateSchema }),
    cutoffAt: IsoDateTimeSchema,
    sources: z.array(SourceManifestSchema).min(1),
    normalizedMetrics: z.array(CanonicalMetricSchema).max(250_000),
    modelVersions: z.array(ModelManifestSchema).default([]),
    configuration: z.record(z.string(), JsonValueSchema).default({}),
  })
  .refine((value) => value.period.from <= value.period.to, {
    path: ["period", "to"],
    message: "El fin del periodo debe ser igual o posterior al inicio",
  });

export const EvidenceStatementSchema = z.object({
  statement: z.string().min(1).max(5_000),
  evidenceIds: z.array(z.string().min(1)).default([]),
});

export const EvidenceRefSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  locator: z.string().min(1),
  observedAt: IsoDateTimeSchema.optional(),
});

export const CreateAnalysisResultSchema = z.object({
  clientId: z.string().min(1),
  snapshotId: z.string().min(1),
  analysisType: z.enum(["mmm", "forecast", "listening", "quality"]),
  observations: z.array(EvidenceStatementSchema),
  inferences: z.array(EvidenceStatementSchema),
  predictions: z.array(JsonValueSchema),
  candidateRecommendations: z.array(JsonValueSchema),
  evidence: z.array(EvidenceRefSchema),
  confidence: JsonValueSchema,
  limitations: z.array(z.string().min(1).max(2_000)),
  model: ModelManifestSchema,
  status: z.enum(["completed", "degraded", "insufficient_data", "failed"]),
});

export const CreateProposedActionSchema = z.object({
  clientId: z.string().min(1),
  snapshotId: z.string().min(1),
  provider: ProviderSchema,
  accountId: z.string().min(1).max(200),
  campaignId: z.string().max(200).optional(),
  entity: z.object({
    type: z.enum(["campaign", "group", "ad"]),
    id: z.string().min(1).max(200),
  }),
  field: z.string().min(1).max(100),
  currentValue: JsonValueSchema,
  proposedValue: JsonValueSchema,
  unit: z.string().min(1).max(50),
  currency: CurrencySchema.optional(),
  expectedImpact: JsonValueSchema,
  uncertaintyInterval: z.object({
    low: z.number().finite(),
    high: z.number().finite(),
    level: z.number().min(0).max(1),
  }),
  risk: z.enum(["low", "medium", "high", "blocked"]),
  evidence: z.array(EvidenceRefSchema).min(1),
  rollbackCondition: JsonValueSchema,
  idempotencyKey: z.string().min(16).max(200),
  remoteStateFingerprint: z.string().min(8).max(300),
  expiresAt: IsoDateTimeSchema,
  requiredApproverRole: z.enum(["OWNER", "ADMIN"]),
  state: z.enum(["draft", "requires_review", "blocked"]).default("requires_review"),
});

export const ActionApprovalSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().min(1).max(2_000).optional(),
});

export const ActionExecutionSchema = z.object({
  mode: z.enum(["dry_run", "execute"]),
  idempotencyKey: z.string().min(16).max(200),
});

export const ActionRollbackSchema = z.object({
  confirm: z.literal(true),
  idempotencyKey: z.string().min(16).max(200),
});

export const EvaluationMetricSchema = z.enum([
  "spend",
  "impressions",
  "clicks",
  "conversions",
  "revenue",
  "cpa",
  "roas",
  "ctr",
  "cpc",
  "cvr",
]);

export const EvaluationScopeSchema = z.object({
  provider: ProviderSchema.optional(),
  accountId: z.string().min(1).max(200).optional(),
  campaignId: z.string().min(1).max(200).optional(),
  groupId: z.string().min(1).max(200).optional(),
  adId: z.string().min(1).max(200).optional(),
});

export const EvaluationPredictionRecordSchema = z.object({
  locator: z.string().min(1).max(500),
  metric: EvaluationMetricSchema,
  value: z.number().finite(),
  baselineValue: z.number().finite().optional(),
  interval: z.object({
    low: z.number().finite(),
    high: z.number().finite(),
    level: z.number().min(0).max(1),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.interval && value.interval.low > value.interval.high) {
    ctx.addIssue({ code: "custom", path: ["interval", "high"], message: "El límite superior debe ser mayor o igual al inferior" });
  }
});

export const CreateEvaluationSchema = z
  .object({
    clientId: z.string().min(1),
    sourceSnapshotId: z.string().min(1),
    outcomeSnapshotId: z.string().min(1),
    evaluationType: z.enum(["forecast_backtest", "shadow_policy"]),
    analysisResultId: z.string().min(1).optional(),
    actionId: z.string().min(1).optional(),
    aggregation: z.literal("period_total").default("period_total"),
    scope: EvaluationScopeSchema.default({}),
    predictionLocator: z.string().min(1).max(500),
    minimumSampleSize: z.number().int().min(1).max(250_000).default(1),
    idempotencyKey: z.string().min(16).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.sourceSnapshotId === value.outcomeSnapshotId) {
      ctx.addIssue({ code: "custom", path: ["outcomeSnapshotId"], message: "El snapshot de resultado debe ser posterior y distinto" });
    }
    if (value.evaluationType === "forecast_backtest" && !value.analysisResultId) {
      ctx.addIssue({ code: "custom", path: ["analysisResultId"], message: "El backtest requiere un resultado analítico" });
    }
    if (value.evaluationType === "forecast_backtest" && value.actionId) {
      ctx.addIssue({ code: "custom", path: ["actionId"], message: "El backtest de forecast no acepta una acción" });
    }
    if (value.evaluationType === "shadow_policy" && !value.actionId) {
      ctx.addIssue({ code: "custom", path: ["actionId"], message: "Shadow mode requiere una acción propuesta" });
    }
    if (value.evaluationType === "shadow_policy" && value.analysisResultId) {
      ctx.addIssue({ code: "custom", path: ["analysisResultId"], message: "Shadow mode obtiene la predicción exclusivamente de la acción" });
    }
  });

export type CreateOptimizationClientInput = z.infer<typeof CreateOptimizationClientSchema>;
export type CreateObjectiveInput = z.infer<typeof CreateObjectiveSchema>;
export type CanonicalMetric = z.infer<typeof CanonicalMetricSchema>;
export type SourceManifest = z.infer<typeof SourceManifestSchema>;
export type CreateSnapshotInput = z.infer<typeof CreateSnapshotSchema>;
export type CreateAnalysisResultInput = z.infer<typeof CreateAnalysisResultSchema>;
export type CreateProposedActionInput = z.infer<typeof CreateProposedActionSchema>;
export type ActionApprovalInput = z.infer<typeof ActionApprovalSchema>;
export type ActionExecutionInput = z.infer<typeof ActionExecutionSchema>;
export type EvaluationMetric = z.infer<typeof EvaluationMetricSchema>;
export type EvaluationScope = z.infer<typeof EvaluationScopeSchema>;
export type EvaluationPredictionRecord = z.infer<typeof EvaluationPredictionRecordSchema>;
export type CreateEvaluationInput = z.infer<typeof CreateEvaluationSchema>;
