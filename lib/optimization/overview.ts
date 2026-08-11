import prisma from "@/lib/prisma";

export type OptimizationReadiness =
  | "mmm_ready"
  | "forecast_ready"
  | "recommendation_only"
  | "insufficient_data";

type QualitySummary = {
  score: number;
  readiness: OptimizationReadiness;
  issues: number;
};

const READINESS = new Set<OptimizationReadiness>([
  "mmm_ready",
  "forecast_ready",
  "recommendation_only",
  "insufficient_data",
]);

export function parseQualitySummary(value: unknown): QualitySummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { score: 0, readiness: "insufficient_data", issues: 0 };
  }

  const quality = value as Record<string, unknown>;
  const rawScore = typeof quality.score === "number" && Number.isFinite(quality.score) ? quality.score : 0;
  const rawReadiness = typeof quality.readiness === "string" ? quality.readiness : "";
  const readiness = READINESS.has(rawReadiness as OptimizationReadiness)
    ? (rawReadiness as OptimizationReadiness)
    : "insufficient_data";
  const issues = Array.isArray(quality.issues) ? quality.issues.length : 0;

  return { score: Math.max(0, Math.min(100, rawScore)), readiness, issues };
}

export async function getOptimizationOverview(workspaceId: string) {
  const now = new Date();
  const [clients, actions, evaluations] = await Promise.all([
    prisma.optimizationClient.findMany({
      where: { workspaceId, status: "active" },
      select: {
        id: true,
        displayName: true,
        defaultCurrency: true,
        timezone: true,
        adAccounts: {
          where: { authorized: true },
          select: { id: true, provider: true },
        },
        objectives: {
          where: { status: "active" },
          orderBy: { version: "desc" },
          take: 1,
          select: {
            primaryKpi: true,
            direction: true,
            targetValue: true,
            currency: true,
            windowType: true,
            riskTolerance: true,
          },
        },
        snapshots: {
          orderBy: { cutoffAt: "desc" },
          take: 1,
          select: {
            id: true,
            cutoffAt: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            dataQuality: true,
          },
        },
        results: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { analysisType: true, status: true, createdAt: true },
        },
        _count: { select: { actions: true, evaluations: true } },
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.optimizationProposedAction.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        clientId: true,
        provider: true,
        accountId: true,
        campaignId: true,
        entity: true,
        field: true,
        currentValue: true,
        proposedValue: true,
        unit: true,
        currency: true,
        expectedImpact: true,
        uncertaintyInterval: true,
        risk: true,
        state: true,
        expiresAt: true,
        requiredApproverRole: true,
        createdAt: true,
        client: { select: { displayName: true } },
      },
    }),
    prisma.optimizationEvaluation.findMany({
      where: { workspaceId },
      orderBy: { evaluatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        clientId: true,
        evaluationType: true,
        metric: true,
        predictedValue: true,
        actualValue: true,
        baselineValue: true,
        intervalLow: true,
        intervalHigh: true,
        intervalLevel: true,
        absoluteError: true,
        percentageError: true,
        withinInterval: true,
        directionalCorrect: true,
        sampleSize: true,
        minimumSampleSize: true,
        status: true,
        causalClaimAllowed: true,
        guardrailResults: true,
        limitations: true,
        evaluatedAt: true,
        client: { select: { displayName: true } },
      },
    }),
  ]);

  const clientRows = clients.map((client) => {
    const snapshot = client.snapshots[0] ?? null;
    const quality = parseQualitySummary(snapshot?.dataQuality);
    return {
      id: client.id,
      displayName: client.displayName,
      currency: client.defaultCurrency,
      timezone: client.timezone,
      authorizedAccounts: client.adAccounts.length,
      providers: [...new Set(client.adAccounts.map((account) => account.provider))],
      objective: client.objectives[0] ?? null,
      latestSnapshot: snapshot
        ? {
            id: snapshot.id,
            cutoffAt: snapshot.cutoffAt.toISOString(),
            periodStart: snapshot.periodStart.toISOString(),
            periodEnd: snapshot.periodEnd.toISOString(),
            status: snapshot.status,
            ...quality,
          }
        : null,
      latestAnalysis: client.results[0]
        ? { ...client.results[0], createdAt: client.results[0].createdAt.toISOString() }
        : null,
      proposedActions: client._count.actions,
      evaluations: client._count.evaluations,
    };
  });

  const actionRows = actions.map(({ client, ...action }) => ({
    ...action,
    state: action.expiresAt <= now && action.state !== "blocked" ? "expired" : action.state,
    expiresAt: action.expiresAt.toISOString(),
    createdAt: action.createdAt.toISOString(),
    clientName: client.displayName,
  }));
  const evaluationRows = evaluations.map(({ client, ...evaluation }) => ({
    ...evaluation,
    evaluatedAt: evaluation.evaluatedAt.toISOString(),
    clientName: client.displayName,
  }));
  const percentageErrors = evaluationRows.flatMap((evaluation) =>
    evaluation.status === "completed" && evaluation.percentageError !== null
      ? [evaluation.percentageError]
      : []
  );

  const readiness = {
    mmm_ready: 0,
    forecast_ready: 0,
    recommendation_only: 0,
    insufficient_data: 0,
  } satisfies Record<OptimizationReadiness, number>;
  for (const client of clientRows) {
    readiness[client.latestSnapshot?.readiness ?? "insufficient_data"] += 1;
  }

  return {
    generatedAt: now.toISOString(),
    mode: "read_only" as const,
    summary: {
      activeClients: clientRows.length,
      clientsWithObjective: clientRows.filter((client) => client.objective).length,
      authorizedAccounts: clientRows.reduce((total, client) => total + client.authorizedAccounts, 0),
      requiresReview: actionRows.filter((action) => action.state === "requires_review").length,
      blocked: actionRows.filter((action) => action.state === "blocked").length,
      completedEvaluations: evaluationRows.filter((evaluation) => evaluation.status === "completed").length,
      inconclusiveEvaluations: evaluationRows.filter((evaluation) => evaluation.status === "inconclusive").length,
      meanAbsolutePercentageError: percentageErrors.length
        ? percentageErrors.reduce((total, value) => total + value, 0) / percentageErrors.length
        : null,
      readiness,
    },
    clients: clientRows,
    actions: actionRows,
    evaluations: evaluationRows,
  };
}

export type OptimizationOverview = Awaited<ReturnType<typeof getOptimizationOverview>>;
