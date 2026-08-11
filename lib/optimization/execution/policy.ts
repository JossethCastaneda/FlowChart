import { hashCanonicalJson } from "../canonical-json";
import type { JsonValue } from "../contracts";

export type ExecutableAction = {
  id: string;
  provider: string;
  accountId: string;
  campaignId: string | null;
  entity: unknown;
  field: string;
  currentValue: unknown;
  proposedValue: unknown;
  unit: string;
  currency: string | null;
  risk: string;
  expiresAt: Date;
  requiredApproverRole: string;
  remoteStateFingerprint: string;
};

export type ApprovalDecision = {
  approverId: string;
  approverRole: string;
  decision: string;
  actionFingerprint: string;
  createdAt: Date;
};

export type ExecutionApprovalPolicy = {
  manualOnly: true;
  executionEnabled: boolean;
  requiredRoles: Array<"OWNER" | "ADMIN">;
  minimumApprovals: number;
  highRiskMinimumApprovals: number;
};

const DEFAULT_POLICY: ExecutionApprovalPolicy = {
  manualOnly: true,
  executionEnabled: false,
  requiredRoles: ["OWNER"],
  minimumApprovals: 1,
  highRiskMinimumApprovals: 2,
};

const ROLE_RANK: Record<string, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

function asEntity(value: unknown): { type: string; id: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entity = value as Record<string, unknown>;
  return typeof entity.type === "string" && typeof entity.id === "string"
    ? { type: entity.type, id: entity.id }
    : null;
}

export function roleSatisfies(actual: string, required: string) {
  return (ROLE_RANK[actual] ?? -1) >= (ROLE_RANK[required] ?? Number.POSITIVE_INFINITY);
}

export function computeActionFingerprint(action: ExecutableAction) {
  const entity = asEntity(action.entity);
  return hashCanonicalJson({
    id: action.id,
    provider: action.provider,
    accountId: action.accountId,
    campaignId: action.campaignId,
    entity: entity ?? null,
    field: action.field,
    currentValue: action.currentValue as JsonValue,
    proposedValue: action.proposedValue as JsonValue,
    unit: action.unit,
    currency: action.currency,
    risk: action.risk,
    expiresAt: action.expiresAt.toISOString(),
    requiredApproverRole: action.requiredApproverRole,
    remoteStateFingerprint: action.remoteStateFingerprint,
  });
}

export function validateExecutableAction(action: ExecutableAction) {
  const entity = asEntity(action.entity);
  if (action.provider !== "meta" && action.provider !== "google") {
    return { ok: false as const, code: "PROVIDER_NOT_EXECUTABLE", message: "El proveedor aún no admite ejecución controlada" };
  }
  if (!entity || entity.type !== "campaign" || action.campaignId !== entity.id) {
    return { ok: false as const, code: "ACTION_NOT_REVERSIBLE", message: "La primera versión solo permite estados de campaña reversibles" };
  }
  if (action.field !== "status") {
    return { ok: false as const, code: "FIELD_NOT_EXECUTABLE", message: "La primera versión solo permite cambiar el estado de campaña" };
  }
  if (!["ACTIVE", "PAUSED"].includes(String(action.currentValue)) || !["ACTIVE", "PAUSED"].includes(String(action.proposedValue))) {
    return { ok: false as const, code: "VALUE_NOT_EXECUTABLE", message: "El estado debe ser ACTIVE o PAUSED" };
  }
  if (action.currentValue === action.proposedValue) {
    return { ok: false as const, code: "NO_CHANGE", message: "La acción no modifica el estado remoto" };
  }
  if (action.risk === "blocked") {
    return { ok: false as const, code: "ACTION_BLOCKED", message: "Una acción marcada como bloqueada no puede ejecutarse" };
  }
  return { ok: true as const, entity };
}

export function parseExecutionApprovalPolicy(activeObjective: unknown): ExecutionApprovalPolicy {
  if (!activeObjective || typeof activeObjective !== "object" || Array.isArray(activeObjective)) return DEFAULT_POLICY;
  const raw = (activeObjective as Record<string, unknown>).approvalPolicy;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return DEFAULT_POLICY;
  const policy = raw as Record<string, unknown>;
  const roles = Array.isArray(policy.requiredRoles)
    ? policy.requiredRoles.filter((role): role is "OWNER" | "ADMIN" => role === "OWNER" || role === "ADMIN")
    : [];
  return {
    manualOnly: true,
    executionEnabled: policy.executionEnabled === true,
    requiredRoles: roles.length ? roles : DEFAULT_POLICY.requiredRoles,
    minimumApprovals: clampApprovalCount(policy.minimumApprovals, DEFAULT_POLICY.minimumApprovals),
    highRiskMinimumApprovals: clampApprovalCount(policy.highRiskMinimumApprovals, DEFAULT_POLICY.highRiskMinimumApprovals),
  };
}

function clampApprovalCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) ? Math.max(1, Math.min(5, value)) : fallback;
}

export function summarizeApprovals(
  action: ExecutableAction,
  approvals: ApprovalDecision[],
  policy: ExecutionApprovalPolicy
) {
  const fingerprint = computeActionFingerprint(action);
  const latestByApprover = new Map<string, ApprovalDecision>();
  for (const approval of [...approvals].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    if (approval.actionFingerprint === fingerprint && !latestByApprover.has(approval.approverId)) {
      latestByApprover.set(approval.approverId, approval);
    }
  }
  const latest = [...latestByApprover.values()];
  const rejected = latest.some((approval) => approval.decision === "rejected");
  const accepted = latest.filter((approval) =>
    approval.decision === "approved" &&
    policy.requiredRoles.includes(approval.approverRole as "OWNER" | "ADMIN") &&
    roleSatisfies(approval.approverRole, action.requiredApproverRole)
  );
  const required = action.risk === "high" ? policy.highRiskMinimumApprovals : policy.minimumApprovals;
  return {
    fingerprint,
    approved: !rejected && accepted.length >= required,
    rejected,
    approvalCount: accepted.length,
    requiredApprovalCount: required,
  };
}
