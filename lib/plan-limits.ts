/**
 * lib/plan-limits.ts
 * =====================================================================
 * Single source of truth for plan-based feature gating.
 *
 * Plans: free → pro → agency
 *
 * Usage (server-side):
 *   const limit = await getPlanLimit(workspaceId, "projects");
 *   if (limit.exceeded) return apiError("Límite de proyectos alcanzado", "PLAN_LIMIT", 402);
 *
 * Usage (client-side):
 *   const { used, limit, exceeded, plan } = usePlanLimit("projects");
 */

export type PlanId = "free" | "pro" | "agency";

export interface PlanLimits {
  projects: number;         // max projects per workspace
  members: number;          // max workspace members (incl. owner)
  integrations: number;     // max connected integrations
  analyticsRetentionDays: number; // how far back analytics data is shown
  scheduledPosts: number;   // max scheduled posts in queue
  aiGenerations: number;    // AI generations per month
}

/** Sentinel value meaning "unlimited" */
export const UNLIMITED = 999_999;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    projects: 3,
    members: 3,
    integrations: 2,
    analyticsRetentionDays: 30,
    scheduledPosts: 10,
    aiGenerations: 50,
  },
  pro: {
    projects: 20,
    members: 10,
    integrations: 10,
    analyticsRetentionDays: 90,
    scheduledPosts: 100,
    aiGenerations: 500,
  },
  agency: {
    projects: UNLIMITED,
    members: UNLIMITED,
    integrations: UNLIMITED,
    analyticsRetentionDays: 365,
    scheduledPosts: UNLIMITED,
    aiGenerations: UNLIMITED,
  },
};

/** Human-readable plan names */
export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Gratis",
  pro: "Pro",
  agency: "Agencia",
};

/** Plan hierarchy for upgrade checks */
export const PLAN_ORDER: PlanId[] = ["free", "pro", "agency"];

/**
 * Returns true if `planA` is strictly higher than `planB`.
 */
export function isPlanHigher(planA: string, planB: string): boolean {
  return PLAN_ORDER.indexOf(planA as PlanId) > PLAN_ORDER.indexOf(planB as PlanId);
}

/**
 * Safely resolves a plan string to a valid PlanId, defaulting to "free".
 */
export function resolvePlan(plan: string | null | undefined): PlanId {
  if (plan === "pro" || plan === "agency") return plan;
  return "free";
}

export interface PlanLimitResult {
  plan: PlanId;
  limit: number;
  used: number;
  remaining: number;
  exceeded: boolean;
  /** A user-facing message when the limit is exceeded */
  message: string;
}

/**
 * Server-side: check if a workspace has exceeded a specific plan limit.
 *
 * @example
 * const limit = await checkPlanLimit(workspaceId, "projects", currentCount);
 * if (limit.exceeded) return apiError(limit.message, "PLAN_LIMIT", 402);
 */
export function checkPlanLimit(
  plan: string | null | undefined,
  feature: keyof PlanLimits,
  used: number,
): PlanLimitResult {
  const resolvedPlan = resolvePlan(plan);
  const limit = PLAN_LIMITS[resolvedPlan][feature];
  const remaining = Math.max(0, limit - used);
  const exceeded = used >= limit;

  const featureNames: Record<keyof PlanLimits, string> = {
    projects: "proyectos",
    members: "miembros del equipo",
    integrations: "integraciones",
    analyticsRetentionDays: "días de historial analítico",
    scheduledPosts: "publicaciones programadas",
    aiGenerations: "generaciones de IA",
  };

  const message = exceeded
    ? `Has alcanzado el límite de ${featureNames[feature]} en tu plan ${PLAN_LABELS[resolvedPlan]} (${limit}). Actualiza a un plan superior para continuar.`
    : "";

  return { plan: resolvedPlan, limit, used, remaining, exceeded, message };
}
