import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashCanonicalJson } from "./canonical-json";
import { assessOptimizationDataQuality } from "./data-quality";
import type {
  CreateAnalysisResultInput,
  CreateObjectiveInput,
  CreateOptimizationClientInput,
  CreateProposedActionInput,
  CreateSnapshotInput,
  JsonValue,
} from "./contracts";

export class OptimizationDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
  }
}

const json = (value: JsonValue | JsonValue[] | Record<string, JsonValue>) => value as Prisma.InputJsonValue;

function accountKey(provider: string, accountId: string) {
  return `${provider}:${accountId}`;
}

const snapshotMetadataSelect = {
  id: true,
  workspaceId: true,
  clientId: true,
  schemaVersion: true,
  contentHash: true,
  periodStart: true,
  periodEnd: true,
  cutoffAt: true,
  currency: true,
  timezone: true,
  freshness: true,
  dataQuality: true,
  modelVersions: true,
  status: true,
  createdById: true,
  createdAt: true,
} satisfies Prisma.OptimizationSnapshotSelect;

async function requireClient(workspaceId: string, clientId: string, tx: Prisma.TransactionClient = prisma) {
  const client = await tx.optimizationClient.findFirst({
    where: { id: clientId, workspaceId },
  });
  if (!client) throw new OptimizationDomainError("Cliente de optimización no encontrado", "CLIENT_NOT_FOUND", 404);
  return client;
}

export async function createOptimizationClient(
  workspaceId: string,
  actorId: string,
  input: CreateOptimizationClientInput
) {
  const duplicateAccountKeys = new Set<string>();
  for (const account of input.adAccounts) {
    const key = accountKey(account.provider, account.externalAccountId);
    if (duplicateAccountKeys.has(key)) {
      throw new OptimizationDomainError("Una cuenta publicitaria está repetida", "DUPLICATE_ACCOUNT", 422);
    }
    duplicateAccountKeys.add(key);
  }

  return prisma.$transaction(async (tx) => {
    if (input.projectIds.length) {
      const projectCount = await tx.project.count({
        where: { id: { in: input.projectIds }, workspaceId },
      });
      if (projectCount !== new Set(input.projectIds).size) {
        throw new OptimizationDomainError("Uno o más proyectos no pertenecen al workspace", "PROJECT_SCOPE_MISMATCH", 403);
      }
    }

    const client = await tx.optimizationClient.create({
      data: {
        workspaceId,
        key: input.key,
        displayName: input.displayName,
        environment: input.environment,
        defaultCurrency: input.defaultCurrency,
        timezone: input.timezone,
      },
    });

    if (input.projectIds.length) {
      await tx.optimizationClientProject.createMany({
        data: input.projectIds.map((projectId) => ({ workspaceId, clientId: client.id, projectId })),
      });
    }
    if (input.adAccounts.length) {
      await tx.optimizationAdAccount.createMany({
        data: input.adAccounts.map((account) => ({
          workspaceId,
          clientId: client.id,
          provider: account.provider,
          externalAccountId: account.externalAccountId,
          displayName: account.displayName,
          currency: account.currency,
          timezone: account.timezone,
          attributionWindow: account.attributionWindow,
          authorized: account.authorized,
          configuration: account.configuration ? json(account.configuration) : undefined,
        })),
      });
    }

    await tx.optimizationAuditEvent.create({
      data: {
        workspaceId,
        clientId: client.id,
        actorId,
        eventType: "client.created",
        payload: json({ key: input.key, environment: input.environment }),
      },
    });
    return client;
  });
}

export async function createOptimizationObjective(
  workspaceId: string,
  actorId: string,
  input: CreateObjectiveInput
) {
  return prisma.$transaction(async (tx) => {
    await requireClient(workspaceId, input.clientId, tx);
    const latest = await tx.optimizationObjective.findFirst({
      where: { workspaceId, clientId: input.clientId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;
    const now = new Date();

    if (input.status === "active") {
      await tx.optimizationObjective.updateMany({
        where: { workspaceId, clientId: input.clientId, status: "active" },
        data: { status: "retired", effectiveTo: now },
      });
    }

    const objective = await tx.optimizationObjective.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        version,
        status: input.status,
        primaryKpi: input.primaryKpi,
        direction: input.direction,
        targetValue: input.targetValue,
        windowType: input.windowType,
        windowStart: input.windowStart ? new Date(input.windowStart) : null,
        windowEnd: input.windowEnd ? new Date(input.windowEnd) : null,
        currency: input.currency,
        timezone: input.timezone,
        hardConstraints: json(input.hardConstraints),
        softPreferences: json(input.softPreferences),
        guardrails: json(input.guardrails),
        riskTolerance: input.riskTolerance,
        maxChangePctPerCycle: input.maxChangePctPerCycle,
        approvalPolicy: json(input.approvalPolicy),
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : input.status === "active" ? now : null,
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        createdById: actorId,
      },
    });

    await tx.optimizationAuditEvent.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        actorId,
        eventType: input.status === "active" ? "objective.activated" : "objective.created",
        payload: json({ objectiveId: objective.id, version, primaryKpi: input.primaryKpi }),
      },
    });
    return objective;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function serializeObjective(objective: Awaited<ReturnType<typeof prisma.optimizationObjective.findFirst>>) {
  if (!objective) return null;
  return {
    id: objective.id,
    version: objective.version,
    primaryKpi: objective.primaryKpi,
    direction: objective.direction,
    targetValue: objective.targetValue,
    windowType: objective.windowType,
    windowStart: objective.windowStart?.toISOString() ?? null,
    windowEnd: objective.windowEnd?.toISOString() ?? null,
    currency: objective.currency,
    timezone: objective.timezone,
    hardConstraints: objective.hardConstraints as JsonValue,
    softPreferences: objective.softPreferences as JsonValue,
    guardrails: objective.guardrails as JsonValue,
    riskTolerance: objective.riskTolerance,
    maxChangePctPerCycle: objective.maxChangePctPerCycle,
    approvalPolicy: objective.approvalPolicy as JsonValue,
    effectiveFrom: objective.effectiveFrom?.toISOString() ?? null,
    effectiveTo: objective.effectiveTo?.toISOString() ?? null,
  } satisfies JsonValue;
}

export async function createOptimizationSnapshot(
  workspaceId: string,
  actorId: string,
  input: CreateSnapshotInput
) {
  const client = await prisma.optimizationClient.findFirst({
    where: { id: input.clientId, workspaceId },
    include: {
      adAccounts: { where: { authorized: true } },
      objectives: { where: { status: "active" }, orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!client) throw new OptimizationDomainError("Cliente de optimización no encontrado", "CLIENT_NOT_FOUND", 404);

  const sources = [...input.sources].sort((left, right) =>
    [left.provider, left.sourceId, left.accountId ?? ""].join("|").localeCompare(
      [right.provider, right.sourceId, right.accountId ?? ""].join("|")
    )
  );
  const normalizedMetrics = [...input.normalizedMetrics].sort((left, right) =>
    [left.date, left.provider, left.accountId, left.level, left.entityId, left.attributionWindow].join("|").localeCompare(
      [right.date, right.provider, right.accountId, right.level, right.entityId, right.attributionWindow].join("|")
    )
  );
  const modelVersions = [...input.modelVersions].sort((left, right) =>
    [left.analysisType, left.provider, left.name, left.version].join("|").localeCompare(
      [right.analysisType, right.provider, right.name, right.version].join("|")
    )
  );

  const allowed = new Set(client.adAccounts.map((account) => accountKey(account.provider, account.externalAccountId)));
  const referenced = [
    ...sources.flatMap((source) => source.accountId && ["meta", "google", "tiktok"].includes(source.provider)
      ? [accountKey(source.provider, source.accountId)]
      : []),
    ...normalizedMetrics.map((metric) => accountKey(metric.provider, metric.accountId)),
  ];
  if (referenced.some((key) => !allowed.has(key))) {
    throw new OptimizationDomainError("El snapshot referencia una cuenta no autorizada para el cliente", "ACCOUNT_SCOPE_MISMATCH", 403);
  }

  const objective = client.objectives[0] ?? null;
  const dataQuality = assessOptimizationDataQuality({
    period: input.period,
    cutoffAt: input.cutoffAt,
    clientCurrency: objective?.currency ?? client.defaultCurrency,
    clientTimezone: objective?.timezone ?? client.timezone,
    authorizedAccountKeys: allowed,
    metrics: normalizedMetrics,
    sources,
    hasActiveObjective: Boolean(objective),
  });
  const cutoff = new Date(input.cutoffAt).getTime();
  const freshness = sources.map((source) => {
    const ageHours = Math.max(0, (cutoff - new Date(source.syncedAt).getTime()) / 3_600_000);
    return { provider: source.provider, sourceId: source.sourceId, accountId: source.accountId ?? null, syncedAt: source.syncedAt, ageHours, status: ageHours <= 48 ? "fresh" : "stale" };
  });
  const authorizedAdAccounts = client.adAccounts
    .map((account) => ({
      provider: account.provider,
      accountId: account.externalAccountId,
      currency: account.currency,
      timezone: account.timezone,
      attributionWindow: account.attributionWindow,
    }))
    .sort((left, right) => `${left.provider}:${left.accountId}`.localeCompare(`${right.provider}:${right.accountId}`));
  const activeObjective = serializeObjective(objective) ?? { status: "missing" };
  const snapshotContent: JsonValue = {
    schemaVersion: input.schemaVersion,
    tenantId: workspaceId,
    clientId: input.clientId,
    period: input.period,
    cutoffAt: input.cutoffAt,
    currency: objective?.currency ?? client.defaultCurrency,
    timezone: objective?.timezone ?? client.timezone,
    authorizedAdAccounts,
    sources,
    freshness,
    normalizedMetrics,
    activeObjective,
    dataQuality: dataQuality as unknown as JsonValue,
    modelVersions,
    configuration: input.configuration,
  };
  const contentHash = hashCanonicalJson(snapshotContent);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.optimizationSnapshot.findUnique({
      where: { workspaceId_clientId_contentHash: { workspaceId, clientId: input.clientId, contentHash } },
      select: snapshotMetadataSelect,
    });
    if (existing) return existing;

    const snapshot = await tx.optimizationSnapshot.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        schemaVersion: input.schemaVersion,
        contentHash,
        periodStart: new Date(`${input.period.from}T00:00:00.000Z`),
        periodEnd: new Date(`${input.period.to}T23:59:59.999Z`),
        cutoffAt: new Date(input.cutoffAt),
        currency: objective?.currency ?? client.defaultCurrency,
        timezone: objective?.timezone ?? client.timezone,
        authorizedAdAccounts: json(authorizedAdAccounts),
        sources: json(sources),
        freshness: json(freshness),
        normalizedMetrics: json(normalizedMetrics),
        activeObjective: json(activeObjective),
        dataQuality: json(dataQuality as unknown as JsonValue),
        modelVersions: json(modelVersions),
        configuration: json(input.configuration),
        status: dataQuality.status,
        createdById: actorId,
      },
      select: snapshotMetadataSelect,
    });
    await tx.optimizationAuditEvent.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        snapshotId: snapshot.id,
        actorId,
        eventType: "snapshot.created",
        payload: json({ contentHash, status: dataQuality.status, readiness: dataQuality.readiness, score: dataQuality.score }),
      },
    });
    return snapshot;
  });
}

export async function createOptimizationAnalysisResult(
  workspaceId: string,
  actorId: string,
  input: CreateAnalysisResultInput
) {
  return prisma.$transaction(async (tx) => {
    const snapshot = await tx.optimizationSnapshot.findFirst({
      where: { id: input.snapshotId, workspaceId, clientId: input.clientId },
    });
    if (!snapshot) throw new OptimizationDomainError("Snapshot no encontrado", "SNAPSHOT_NOT_FOUND", 404);
    const result = await tx.optimizationAnalysisResult.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        snapshotId: input.snapshotId,
        analysisType: input.analysisType,
        observations: json(input.observations),
        inferences: json(input.inferences),
        predictions: json(input.predictions),
        candidateRecommendations: json(input.candidateRecommendations),
        evidence: json(input.evidence),
        confidence: json(input.confidence),
        limitations: json(input.limitations),
        model: json(input.model),
        status: input.status,
      },
    });
    await tx.optimizationAuditEvent.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        snapshotId: input.snapshotId,
        actorId,
        eventType: "analysis_result.created",
        payload: json({ resultId: result.id, analysisType: input.analysisType, status: input.status }),
      },
    });
    return result;
  });
}

export async function createOptimizationProposedAction(
  workspaceId: string,
  actorId: string,
  input: CreateProposedActionInput
) {
  if (new Date(input.expiresAt).getTime() <= Date.now()) {
    throw new OptimizationDomainError("La recomendación debe tener una caducidad futura", "ACTION_EXPIRED", 422);
  }
  return prisma.$transaction(async (tx) => {
    const existing = await tx.optimizationProposedAction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.workspaceId === workspaceId && existing.clientId === input.clientId) return existing;
      throw new OptimizationDomainError("La clave de idempotencia no está disponible", "IDEMPOTENCY_CONFLICT", 409);
    }
    const snapshot = await tx.optimizationSnapshot.findFirst({
      where: { id: input.snapshotId, workspaceId, clientId: input.clientId },
    });
    if (!snapshot) throw new OptimizationDomainError("Snapshot no encontrado", "SNAPSHOT_NOT_FOUND", 404);
    const account = await tx.optimizationAdAccount.findFirst({
      where: { workspaceId, clientId: input.clientId, provider: input.provider, externalAccountId: input.accountId, authorized: true },
    });
    if (!account) throw new OptimizationDomainError("Cuenta publicitaria no autorizada", "ACCOUNT_SCOPE_MISMATCH", 403);

    const state = snapshot.status === "invalid" || input.risk === "blocked" ? "blocked" : input.state;
    const action = await tx.optimizationProposedAction.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        snapshotId: input.snapshotId,
        provider: input.provider,
        accountId: input.accountId,
        campaignId: input.campaignId,
        entity: json(input.entity),
        field: input.field,
        currentValue: json(input.currentValue),
        proposedValue: json(input.proposedValue),
        unit: input.unit,
        currency: input.currency,
        expectedImpact: json(input.expectedImpact),
        uncertaintyInterval: json(input.uncertaintyInterval),
        risk: input.risk,
        evidence: json(input.evidence),
        rollbackCondition: json(input.rollbackCondition),
        idempotencyKey: input.idempotencyKey,
        remoteStateFingerprint: input.remoteStateFingerprint,
        expiresAt: new Date(input.expiresAt),
        requiredApproverRole: input.requiredApproverRole,
        state,
        createdById: actorId,
      },
    });
    await tx.optimizationAuditEvent.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        snapshotId: input.snapshotId,
        actionId: action.id,
        actorId,
        eventType: state === "blocked" ? "proposed_action.blocked" : "proposed_action.created",
        payload: json({ provider: input.provider, accountId: input.accountId, entity: input.entity, field: input.field, state }),
      },
    });
    return action;
  });
}
