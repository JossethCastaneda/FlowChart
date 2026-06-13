// ============================================================================
// Motor de reglas de outcome configurables (spec §15).
// Reglas por workspace, evaluadas EN ORDEN DE PRIORIDAD (menor número primero).
// La primera que hace match clasifica la conversación y se registra cuál fue
// (appliedRuleId) para trazabilidad/auditoría.
// ============================================================================

export type ConditionOperator = "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains";

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface RuleActions {
  requiresReview?: boolean;
  tag?: string;
}

/** Forma mínima de una regla, compatible con AnalyticsOutcomeRule de Prisma. */
export interface OutcomeRuleLike {
  id: string;
  name: string;
  conditions: unknown; // string JSON o RuleCondition[]
  outcome: string;
  resolvedBy: string;
  priority?: number | null;
  enabled?: boolean | null;
  actions?: unknown;
  appliesToProvider?: string | null;
}

/** Conversación: aceptamos cualquier registro con campos accesibles por nombre. */
export type ConversationLike = Record<string, unknown> & { provider?: string };

export interface OutcomeResult {
  outcome: string;
  resolvedBy: string;
  requiresReview: boolean;
  appliedRuleId: string;
  appliedRuleName: string;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  return Number(v);
}

function evaluateCondition(actual: unknown, operator: ConditionOperator, expected: unknown): boolean {
  if (actual === undefined || actual === null) return false;
  switch (operator) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return toNumber(actual) > toNumber(expected);
    case "lt": return toNumber(actual) < toNumber(expected);
    case "gte": return toNumber(actual) >= toNumber(expected);
    case "lte": return toNumber(actual) <= toNumber(expected);
    case "contains":
      if (typeof actual === "string") return actual.includes(String(expected));
      if (Array.isArray(actual)) return actual.includes(expected);
      return false;
    default:
      return false;
  }
}

/** Resuelve el valor real de un campo, incluyendo alias virtuales comunes. */
function resolveField(conversation: ConversationLike, field: string): unknown {
  switch (field) {
    case "handoff": return conversation.wasHandoff;
    case "fallback": return conversation.totalFallbacks;
    case "integrationError": return conversation.status === "error";
    case "csat": return conversation.csatScore;
    case "taskCompleted": return Boolean(conversation.serviceId) && conversation.status === "closed";
    default: return conversation[field];
  }
}

function parseConditions(raw: unknown): RuleCondition[] {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? (parsed as RuleCondition[]) : [];
}

function parseActions(raw: unknown): RuleActions {
  if (!raw) return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return (parsed && typeof parsed === "object" ? parsed : {}) as RuleActions;
}

/** Ordena por prioridad ascendente (estable) y descarta reglas deshabilitadas/de otro proveedor. */
function activeRulesFor(rules: OutcomeRuleLike[], provider?: string): OutcomeRuleLike[] {
  return rules
    .filter((r) => r.enabled !== false)
    .filter((r) => !r.appliesToProvider || !provider || r.appliesToProvider === provider)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.priority ?? 100) - (b.r.priority ?? 100) || a.i - b.i)
    .map(({ r }) => r);
}

/**
 * Evalúa las reglas y devuelve la clasificación completa (con regla aplicada y
 * requiresReview) o null si ninguna aplica.
 */
export function applyOutcomeRules(
  conversation: ConversationLike,
  rules: OutcomeRuleLike[]
): OutcomeResult | null {
  for (const rule of activeRulesFor(rules, conversation.provider)) {
    try {
      const conditions = parseConditions(rule.conditions);
      if (conditions.length === 0) continue;
      const matchesAll = conditions.every((c) =>
        evaluateCondition(resolveField(conversation, c.field), c.operator, c.value)
      );
      if (matchesAll) {
        const actions = parseActions(rule.actions);
        return {
          outcome: rule.outcome,
          resolvedBy: rule.resolvedBy,
          requiresReview: actions.requiresReview === true,
          appliedRuleId: rule.id,
          appliedRuleName: rule.name,
        };
      }
    } catch (e) {
      // Una regla malformada no debe tumbar la clasificación de las demás.
      console.error(`[outcome-rules] regla inválida ${rule.id}:`, e);
      continue;
    }
  }
  return null;
}

/**
 * Compat: devuelve solo { outcome, resolvedBy } como la versión previa.
 * Lo usa el motor de KPIs para recalcular outcomes al vuelo.
 */
export function determineConversationOutcome(
  conversation: ConversationLike,
  rules: OutcomeRuleLike[]
): { outcome: string; resolvedBy: string } | null {
  const result = applyOutcomeRules(conversation, rules);
  return result ? { outcome: result.outcome, resolvedBy: result.resolvedBy } : null;
}
