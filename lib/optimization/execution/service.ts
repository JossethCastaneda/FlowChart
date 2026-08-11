import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";
import { OptimizationDomainError } from "../service";
import type { ActionApprovalInput, ActionExecutionInput, JsonValue } from "../contracts";
import { liveOptimizationProvider } from "./live-provider";
import { ProviderExecutionError, type OptimizationExecutionProvider, type ProviderAction } from "./provider";
import {
  computeActionFingerprint,
  parseExecutionApprovalPolicy,
  roleSatisfies,
  summarizeApprovals,
  validateExecutableAction,
  type ExecutableAction,
} from "./policy";

const json = (value: JsonValue | Record<string, JsonValue>) => value as Prisma.InputJsonValue;

type ExecutionDependencies = {
  provider: OptimizationExecutionProvider;
  now: () => Date;
};

const defaultDependencies: ExecutionDependencies = {
  provider: liveOptimizationProvider,
  now: () => new Date(),
};

function error(message: string, code: string, status: number): never {
  throw new OptimizationDomainError(message, code, status);
}

async function loadAction(workspaceId: string, actionId: string) {
  const action = await prisma.optimizationProposedAction.findFirst({
    where: { id: actionId, workspaceId },
    include: {
      snapshot: { select: { status: true, activeObjective: true } },
      approvals: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!action) error("Acción propuesta no encontrada", "ACTION_NOT_FOUND", 404);
  return action;
}

function executable(action: Awaited<ReturnType<typeof loadAction>>): ExecutableAction {
  return {
    id: action.id,
    provider: action.provider,
    accountId: action.accountId,
    campaignId: action.campaignId,
    entity: action.entity,
    field: action.field,
    currentValue: action.currentValue,
    proposedValue: action.proposedValue,
    unit: action.unit,
    currency: action.currency,
    risk: action.risk,
    expiresAt: action.expiresAt,
    requiredApproverRole: action.requiredApproverRole,
    remoteStateFingerprint: action.remoteStateFingerprint,
  };
}

function providerAction(action: ExecutableAction): ProviderAction {
  const validation = validateExecutableAction(action);
  if (!validation.ok) error(validation.message, validation.code, 422);
  return {
    provider: action.provider,
    accountId: action.accountId,
    entity: { type: "campaign", id: validation.entity.id },
    field: "status",
  };
}

function ensureActionIsCurrent(action: Awaited<ReturnType<typeof loadAction>>, now: Date) {
  if (action.expiresAt <= now) error("La recomendación caducó", "ACTION_EXPIRED", 409);
  if (action.snapshot.status === "invalid") error("El snapshot de origen es inválido", "SNAPSHOT_INVALID", 409);
}

function normalizeIdempotencyKey(actionId: string, operation: string, key: string) {
  return `optimization:${actionId}:${operation}:${key}`;
}

function safeProviderError(cause: unknown) {
  if (cause instanceof ProviderExecutionError) {
    return { code: cause.code, message: cause.message.slice(0, 500) };
  }
  return { code: "PROVIDER_OPERATION_FAILED", message: "El proveedor no confirmó la operación" };
}

async function assertAuthorizedAccount(workspaceId: string, action: ExecutableAction & { clientId: string }) {
  const account = await prisma.optimizationAdAccount.findFirst({
    where: {
      workspaceId,
      clientId: action.clientId,
      provider: action.provider,
      externalAccountId: action.accountId,
      authorized: true,
    },
    select: { id: true },
  });
  if (!account) error("La cuenta publicitaria ya no está autorizada", "ACCOUNT_SCOPE_MISMATCH", 403);
}

export async function recordOptimizationActionApproval(
  workspaceId: string,
  actorId: string,
  actorRole: string,
  actionId: string,
  input: ActionApprovalInput
) {
  const action = await loadAction(workspaceId, actionId);
  const now = new Date();
  ensureActionIsCurrent(action, now);
  if (["executed", "rolled_back", "blocked"].includes(action.state)) {
    error("La acción ya no admite decisiones", "ACTION_STATE_CONFLICT", 409);
  }
  if (!roleSatisfies(actorRole, action.requiredApproverRole)) {
    error(`La acción requiere rol ${action.requiredApproverRole}`, "APPROVER_ROLE_REQUIRED", 403);
  }
  if (input.decision === "rejected" && !input.comment) {
    error("El rechazo requiere un motivo", "REJECTION_COMMENT_REQUIRED", 422);
  }

  const actionView = executable(action);
  const fingerprint = computeActionFingerprint(actionView);
  const policy = parseExecutionApprovalPolicy(action.snapshot.activeObjective);
  if (!policy.requiredRoles.includes(actorRole as "OWNER" | "ADMIN")) {
    error("El rol no forma parte de la política de aprobación vigente", "APPROVER_POLICY_MISMATCH", 403);
  }

  return prisma.$transaction(async (tx) => {
    const approval = await tx.optimizationActionApproval.create({
      data: {
        workspaceId,
        clientId: action.clientId,
        actionId,
        approverId: actorId,
        approverRole: actorRole,
        decision: input.decision,
        comment: input.comment,
        actionFingerprint: fingerprint,
      },
    });
    const currentApprovals = await tx.optimizationActionApproval.findMany({
      where: { workspaceId, clientId: action.clientId, actionId },
      orderBy: { createdAt: "desc" },
    });
    const summary = summarizeApprovals(actionView, currentApprovals, policy);
    const state = summary.rejected ? "rejected" : summary.approved ? "approved" : "requires_review";
    await tx.optimizationProposedAction.update({ where: { id: actionId }, data: { state } });
    await tx.optimizationAuditEvent.create({
      data: {
        workspaceId,
        clientId: action.clientId,
        snapshotId: action.snapshotId,
        actionId,
        actorId,
        eventType: `proposed_action.${input.decision}`,
        payload: json({
          approvalId: approval.id,
          approverRole: actorRole,
          actionFingerprint: fingerprint,
          approvalCount: summary.approvalCount,
          requiredApprovalCount: summary.requiredApprovalCount,
          resultingState: state,
        }),
      },
    });
    return { approval, state, ...summary };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function createAttempt(input: {
  workspaceId: string;
  clientId: string;
  actionId: string;
  operation: string;
  status: string;
  idempotencyKey: string;
  actorId: string;
  actorRole: string;
  actionFingerprint: string;
  expectedRemoteFingerprint: string;
}) {
  try {
    return { existing: false, execution: await prisma.optimizationActionExecution.create({
      data: {
        workspaceId: input.workspaceId,
        clientId: input.clientId,
        actionId: input.actionId,
        operation: input.operation,
        status: input.status,
        idempotencyKey: input.idempotencyKey,
        requestedById: input.actorId,
        requestedByRole: input.actorRole,
        actionFingerprint: input.actionFingerprint,
        expectedRemoteFingerprint: input.expectedRemoteFingerprint,
      },
    }) };
  } catch (cause) {
    if (!(cause instanceof Prisma.PrismaClientKnownRequestError) || cause.code !== "P2002") throw cause;
    const existing = await prisma.optimizationActionExecution.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (!existing || existing.workspaceId !== input.workspaceId || existing.actionId !== input.actionId) {
      error("La clave de idempotencia no está disponible", "IDEMPOTENCY_CONFLICT", 409);
    }
    return { existing: true, execution: existing };
  }
}

async function findIdempotentAttempt(workspaceId: string, actionId: string, idempotencyKey: string) {
  const existing = await prisma.optimizationActionExecution.findUnique({ where: { idempotencyKey } });
  if (!existing) return null;
  if (existing.workspaceId !== workspaceId || existing.actionId !== actionId) {
    error("La clave de idempotencia no está disponible", "IDEMPOTENCY_CONFLICT", 409);
  }
  return existing;
}

async function completeAttempt(
  id: string,
  data: {
    status: string;
    observedRemoteFingerprint?: string;
    remoteBefore?: JsonValue;
    remoteAfter?: JsonValue;
    providerRequestId?: string;
    errorCode?: string;
    errorMessage?: string;
  },
  now: Date
) {
  return prisma.optimizationActionExecution.update({
    where: { id },
    data: {
      ...data,
      remoteBefore: data.remoteBefore === undefined ? undefined : json(data.remoteBefore),
      remoteAfter: data.remoteAfter === undefined ? undefined : json(data.remoteAfter),
      completedAt: now,
    },
  });
}

export async function runOptimizationAction(
  workspaceId: string,
  actorId: string,
  actorRole: string,
  actionId: string,
  input: ActionExecutionInput,
  dependencies: ExecutionDependencies = defaultDependencies
) {
  const action = await loadAction(workspaceId, actionId);
  const actionView = { ...executable(action), clientId: action.clientId };
  const now = dependencies.now();
  const idempotencyKey = normalizeIdempotencyKey(actionId, input.mode, input.idempotencyKey);
  const idempotent = await findIdempotentAttempt(workspaceId, actionId, idempotencyKey);
  if (idempotent) return idempotent;
  ensureActionIsCurrent(action, now);
  await assertAuthorizedAccount(workspaceId, actionView);
  const remoteAction = providerAction(actionView);
  const actionFingerprint = computeActionFingerprint(actionView);
  if (input.mode === "dry_run") {
    if (!["requires_review", "approved"].includes(action.state)) {
      error("La acción no admite preflight en su estado actual", "ACTION_STATE_CONFLICT", 409);
    }
    const attempt = await createAttempt({
      workspaceId, clientId: action.clientId, actionId, operation: "dry_run", status: "validating",
      idempotencyKey, actorId, actorRole, actionFingerprint,
      expectedRemoteFingerprint: action.remoteStateFingerprint,
    });
    if (attempt.existing) return attempt.execution;
    try {
      const remote = await dependencies.provider.read(workspaceId, remoteAction);
      const valid = remote.fingerprint === action.remoteStateFingerprint && remote.value === action.currentValue;
      const completed = await completeAttempt(attempt.execution.id, {
        status: valid ? "validated" : "blocked",
        observedRemoteFingerprint: remote.fingerprint,
        remoteBefore: { value: remote.value, fingerprint: remote.fingerprint },
        remoteAfter: { value: action.proposedValue as JsonValue },
        providerRequestId: remote.providerRequestId,
        errorCode: valid ? undefined : "REMOTE_STATE_CHANGED",
        errorMessage: valid ? undefined : "El estado remoto cambió después del análisis",
      }, dependencies.now());
      await prisma.optimizationAuditEvent.create({
        data: {
          workspaceId, clientId: action.clientId, snapshotId: action.snapshotId, actionId, actorId,
          eventType: valid ? "execution.preflight_validated" : "execution.preflight_blocked",
          payload: json({ executionId: completed.id, actionFingerprint, remoteFingerprint: remote.fingerprint }),
        },
      });
      return completed;
    } catch (cause) {
      const failure = safeProviderError(cause);
      return completeAttempt(attempt.execution.id, { status: "failed", errorCode: failure.code, errorMessage: failure.message }, dependencies.now());
    }
  }

  if (env.OPTIMIZATION_EXECUTION_ENABLED !== "true") {
    error("La ejecución remota está deshabilitada", "EXECUTION_DISABLED", 409);
  }
  if (env.OPTIMIZATION_KILL_SWITCH === "true") {
    error("El kill switch de optimización está activo", "EXECUTION_KILL_SWITCH", 423);
  }
  if (!roleSatisfies(actorRole, action.requiredApproverRole)) {
    error(`La ejecución requiere rol ${action.requiredApproverRole}`, "EXECUTOR_ROLE_REQUIRED", 403);
  }
  if (action.state !== "approved") error("La acción aún no tiene aprobación suficiente", "ACTION_NOT_APPROVED", 409);
  const policy = parseExecutionApprovalPolicy(action.snapshot.activeObjective);
  const approvalSummary = summarizeApprovals(actionView, action.approvals, policy);
  if (!policy.executionEnabled) error("La meta vigente no autoriza ejecución", "OBJECTIVE_EXECUTION_DISABLED", 409);
  if (!approvalSummary.approved) error("Las aprobaciones vigentes no satisfacen la política", "APPROVALS_INSUFFICIENT", 409);

  const threshold = new Date(now.getTime() - env.OPTIMIZATION_DRY_RUN_TTL_MINUTES * 60_000);
  const dryRun = await prisma.optimizationActionExecution.findFirst({
    where: {
      workspaceId, actionId, operation: "dry_run", status: "validated",
      actionFingerprint, completedAt: { gte: threshold },
      observedRemoteFingerprint: action.remoteStateFingerprint,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!dryRun) error("Se requiere un dry-run reciente y válido", "PREFLIGHT_REQUIRED", 409);

  const remoteBefore = await dependencies.provider.read(workspaceId, remoteAction);
  if (remoteBefore.fingerprint !== action.remoteStateFingerprint || remoteBefore.value !== action.currentValue) {
    error("El dato remoto cambió después del preflight", "REMOTE_STATE_CHANGED", 409);
  }

  let execution;
  try {
    execution = await prisma.$transaction(async (tx) => {
      const dailyCount = await tx.optimizationActionExecution.count({
        where: {
          workspaceId,
          operation: "execute",
          status: { in: ["executing", "succeeded"] },
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) },
        },
      });
      if (dailyCount >= env.OPTIMIZATION_MAX_DAILY_ACTIONS) error("Se alcanzó el límite diario de acciones", "DAILY_LIMIT_REACHED", 429);
      const transition = await tx.optimizationProposedAction.updateMany({
        where: { id: actionId, workspaceId, state: "approved" },
        data: { state: "executing" },
      });
      if (transition.count !== 1) error("Otra ejecución ya tomó esta acción", "ACTION_CONCURRENCY_CONFLICT", 409);
      return tx.optimizationActionExecution.create({
        data: {
          workspaceId, clientId: action.clientId, actionId, operation: "execute", status: "executing",
          idempotencyKey, requestedById: actorId, requestedByRole: actorRole,
          actionFingerprint, expectedRemoteFingerprint: action.remoteStateFingerprint,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
      const existing = await findIdempotentAttempt(workspaceId, actionId, idempotencyKey);
      if (existing) return existing;
    }
    throw cause;
  }

  try {
    const remoteAfter = await dependencies.provider.apply(workspaceId, remoteAction, action.proposedValue as JsonValue);
    const expectedAfter = { ...remoteAction };
    const verified = remoteAfter.value === action.proposedValue;
    const completed = await completeAttempt(execution.id, {
      status: verified ? "succeeded" : "failed",
      observedRemoteFingerprint: remoteBefore.fingerprint,
      remoteBefore: { value: remoteBefore.value, fingerprint: remoteBefore.fingerprint },
      remoteAfter: { value: remoteAfter.value, fingerprint: remoteAfter.fingerprint },
      providerRequestId: remoteAfter.providerRequestId,
      errorCode: verified ? undefined : "REMOTE_WRITE_UNVERIFIED",
      errorMessage: verified ? undefined : "El proveedor no reflejó el valor propuesto",
    }, dependencies.now());
    await prisma.$transaction([
      prisma.optimizationProposedAction.update({ where: { id: actionId }, data: { state: verified ? "executed" : "blocked" } }),
      prisma.optimizationAuditEvent.create({ data: {
        workspaceId, clientId: action.clientId, snapshotId: action.snapshotId, actionId, actorId,
        eventType: verified ? "execution.succeeded" : "execution.verification_failed",
        payload: json({ executionId: completed.id, provider: expectedAfter.provider, actionFingerprint }),
      } }),
    ]);
    return completed;
  } catch (cause) {
    const failure = safeProviderError(cause);
    const completed = await completeAttempt(execution.id, { status: "failed", errorCode: failure.code, errorMessage: failure.message }, dependencies.now());
    await prisma.$transaction([
      prisma.optimizationProposedAction.updateMany({ where: { id: actionId, state: "executing" }, data: { state: "approved" } }),
      prisma.optimizationAuditEvent.create({ data: {
        workspaceId, clientId: action.clientId, snapshotId: action.snapshotId, actionId, actorId,
        eventType: "execution.failed", payload: json({ executionId: completed.id, errorCode: failure.code }),
      } }),
    ]);
    return completed;
  }
}

function persistedRemoteState(value: Prisma.JsonValue | null, name: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) error(`${name} no está disponible`, "ROLLBACK_STATE_MISSING", 409);
  const state = value as Record<string, Prisma.JsonValue>;
  if (typeof state.fingerprint !== "string" || !("value" in state)) error(`${name} es inválido`, "ROLLBACK_STATE_INVALID", 409);
  return { fingerprint: state.fingerprint, value: state.value as JsonValue };
}

export async function rollbackOptimizationAction(
  workspaceId: string,
  actorId: string,
  actorRole: string,
  actionId: string,
  idempotencyKeyInput: string,
  dependencies: ExecutionDependencies = defaultDependencies
) {
  if (actorRole !== "OWNER") error("El rollback requiere rol OWNER", "OWNER_REQUIRED", 403);
  if (env.OPTIMIZATION_EXECUTION_ENABLED !== "true") error("La ejecución remota está deshabilitada", "EXECUTION_DISABLED", 409);
  const action = await loadAction(workspaceId, actionId);
  const idempotencyKey = normalizeIdempotencyKey(actionId, "rollback", idempotencyKeyInput);
  const idempotent = await findIdempotentAttempt(workspaceId, actionId, idempotencyKey);
  if (idempotent) return idempotent;
  if (action.state !== "executed") error("La acción no está en estado ejecutado", "ACTION_NOT_EXECUTED", 409);
  const actionView = { ...executable(action), clientId: action.clientId };
  await assertAuthorizedAccount(workspaceId, actionView);
  const remoteAction = providerAction(actionView);
  const actionFingerprint = computeActionFingerprint(actionView);
  const live = await prisma.optimizationActionExecution.findFirst({
    where: { workspaceId, actionId, operation: "execute", status: "succeeded", actionFingerprint },
    orderBy: { createdAt: "desc" },
  });
  if (!live) error("No existe una ejecución verificable para revertir", "EXECUTION_NOT_FOUND", 404);
  const before = persistedRemoteState(live.remoteBefore, "El estado anterior");
  const after = persistedRemoteState(live.remoteAfter, "El estado ejecutado");
  const current = await dependencies.provider.read(workspaceId, remoteAction);
  if (current.fingerprint !== after.fingerprint || current.value !== after.value) {
    error("El dato remoto cambió después de la ejecución", "REMOTE_STATE_CHANGED", 409);
  }

  let execution;
  try {
    execution = await prisma.$transaction(async (tx) => {
      const transition = await tx.optimizationProposedAction.updateMany({
        where: { id: actionId, workspaceId, state: "executed" }, data: { state: "rollback_pending" },
      });
      if (transition.count !== 1) error("Otra operación ya tomó esta acción", "ACTION_CONCURRENCY_CONFLICT", 409);
      return tx.optimizationActionExecution.create({
        data: {
          workspaceId, clientId: action.clientId, actionId, operation: "rollback", status: "executing",
          idempotencyKey, requestedById: actorId, requestedByRole: actorRole,
          actionFingerprint, expectedRemoteFingerprint: after.fingerprint,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") {
      const existing = await findIdempotentAttempt(workspaceId, actionId, idempotencyKey);
      if (existing) return existing;
    }
    throw cause;
  }

  try {
    const restored = await dependencies.provider.apply(workspaceId, remoteAction, before.value);
    const verified = restored.fingerprint === before.fingerprint && restored.value === before.value;
    const completed = await completeAttempt(execution.id, {
      status: verified ? "succeeded" : "failed",
      observedRemoteFingerprint: current.fingerprint,
      remoteBefore: { value: current.value, fingerprint: current.fingerprint },
      remoteAfter: { value: restored.value, fingerprint: restored.fingerprint },
      providerRequestId: restored.providerRequestId,
      errorCode: verified ? undefined : "ROLLBACK_UNVERIFIED",
      errorMessage: verified ? undefined : "El proveedor no confirmó la reversión",
    }, dependencies.now());
    await prisma.$transaction([
      prisma.optimizationProposedAction.update({ where: { id: actionId }, data: { state: verified ? "rolled_back" : "blocked" } }),
      prisma.optimizationAuditEvent.create({ data: {
        workspaceId, clientId: action.clientId, snapshotId: action.snapshotId, actionId, actorId,
        eventType: verified ? "execution.rolled_back" : "execution.rollback_verification_failed",
        payload: json({ executionId: completed.id, sourceExecutionId: live.id, actionFingerprint }),
      } }),
    ]);
    return completed;
  } catch (cause) {
    const failure = safeProviderError(cause);
    const completed = await completeAttempt(execution.id, { status: "failed", errorCode: failure.code, errorMessage: failure.message }, dependencies.now());
    await prisma.$transaction([
      prisma.optimizationProposedAction.updateMany({ where: { id: actionId, state: "rollback_pending" }, data: { state: "executed" } }),
      prisma.optimizationAuditEvent.create({ data: {
        workspaceId, clientId: action.clientId, snapshotId: action.snapshotId, actionId, actorId,
        eventType: "execution.rollback_failed", payload: json({ executionId: completed.id, errorCode: failure.code }),
      } }),
    ]);
    return completed;
  }
}
