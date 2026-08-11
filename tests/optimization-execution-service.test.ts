import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    OPTIMIZATION_EXECUTION_ENABLED: "false",
    OPTIMIZATION_KILL_SWITCH: "false",
    OPTIMIZATION_MAX_DAILY_ACTIONS: 10,
    OPTIMIZATION_DRY_RUN_TTL_MINUTES: 15,
  },
}));

vi.mock("@/lib/optimization/execution/live-provider", () => ({
  liveOptimizationProvider: { read: vi.fn(), apply: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    optimizationProposedAction: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    optimizationAdAccount: { findFirst: vi.fn() },
    optimizationActionExecution: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    optimizationAuditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import prisma from "@/lib/prisma";
import { remoteStateFingerprint } from "../lib/optimization/execution/provider";
import { rollbackOptimizationAction, runOptimizationAction } from "../lib/optimization/execution/service";

const mocked = prisma as unknown as {
  optimizationProposedAction: { findFirst: ReturnType<typeof vi.fn> };
  optimizationAdAccount: { findFirst: ReturnType<typeof vi.fn> };
  optimizationActionExecution: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  optimizationAuditEvent: { create: ReturnType<typeof vi.fn> };
};

const providerAction = {
  provider: "meta",
  accountId: "act_123",
  entity: { type: "campaign" as const, id: "456" },
  field: "status" as const,
};

function proposedAction() {
  return {
    id: "action-1",
    workspaceId: "ws-1",
    clientId: "client-1",
    snapshotId: "snapshot-1",
    provider: "meta",
    accountId: "act_123",
    campaignId: "456",
    entity: { type: "campaign", id: "456" },
    field: "status",
    currentValue: "ACTIVE",
    proposedValue: "PAUSED",
    unit: "state",
    currency: null,
    risk: "low",
    expiresAt: new Date("2099-08-20T00:00:00.000Z"),
    requiredApproverRole: "ADMIN",
    remoteStateFingerprint: remoteStateFingerprint(providerAction, "ACTIVE"),
    state: "requires_review",
    snapshot: { status: "valid", activeObjective: { approvalPolicy: { executionEnabled: false } } },
    approvals: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.optimizationProposedAction.findFirst.mockResolvedValue(proposedAction());
  mocked.optimizationAdAccount.findFirst.mockResolvedValue({ id: "account-1" });
  mocked.optimizationActionExecution.findUnique.mockResolvedValue(null);
  mocked.optimizationActionExecution.create.mockImplementation(({ data }) => Promise.resolve({ id: "execution-1", ...data, createdAt: new Date() }));
  mocked.optimizationActionExecution.update.mockImplementation(({ data }) => Promise.resolve({ id: "execution-1", ...data }));
  mocked.optimizationAuditEvent.create.mockResolvedValue({ id: "audit-1" });
});

describe("optimization execution dry-run", () => {
  it("validates remote state without calling the write adapter", async () => {
    const provider = {
      read: vi.fn().mockResolvedValue({ value: "ACTIVE", fingerprint: remoteStateFingerprint(providerAction, "ACTIVE") }),
      apply: vi.fn(),
    };

    const result = await runOptimizationAction("ws-1", "user-1", "ADMIN", "action-1", {
      mode: "dry_run",
      idempotencyKey: "dry-run-idempotency-0001",
    }, { provider, now: () => new Date("2026-08-11T12:00:00.000Z") });

    expect(result).toMatchObject({ status: "validated" });
    expect(provider.read).toHaveBeenCalledOnce();
    expect(provider.apply).not.toHaveBeenCalled();
    expect(mocked.optimizationActionExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "validated" }),
    }));
  });

  it("blocks stale remote state and still performs no write", async () => {
    const provider = {
      read: vi.fn().mockResolvedValue({ value: "PAUSED", fingerprint: remoteStateFingerprint(providerAction, "PAUSED") }),
      apply: vi.fn(),
    };

    const result = await runOptimizationAction("ws-1", "user-1", "ADMIN", "action-1", {
      mode: "dry_run",
      idempotencyKey: "dry-run-idempotency-0002",
    }, { provider, now: () => new Date("2026-08-11T12:00:00.000Z") });

    expect(result).toMatchObject({ status: "blocked", errorCode: "REMOTE_STATE_CHANGED" });
    expect(provider.apply).not.toHaveBeenCalled();
  });

  it("returns an existing attempt without touching the provider", async () => {
    const existing = { id: "existing", workspaceId: "ws-1", actionId: "action-1", status: "validated" };
    mocked.optimizationActionExecution.findUnique.mockResolvedValue(existing);
    const provider = { read: vi.fn(), apply: vi.fn() };

    await expect(runOptimizationAction("ws-1", "user-1", "ADMIN", "action-1", {
      mode: "dry_run",
      idempotencyKey: "dry-run-idempotency-0003",
    }, { provider, now: () => new Date("2026-08-11T12:00:00.000Z") })).resolves.toBe(existing);
    expect(provider.read).not.toHaveBeenCalled();
    expect(provider.apply).not.toHaveBeenCalled();
  });

  it("fails closed before any remote call while live execution is disabled", async () => {
    const provider = { read: vi.fn(), apply: vi.fn() };
    await expect(runOptimizationAction("ws-1", "user-1", "ADMIN", "action-1", {
      mode: "execute",
      idempotencyKey: "live-idempotency-000001",
    }, { provider, now: () => new Date("2026-08-11T12:00:00.000Z") })).rejects.toMatchObject({
      code: "EXECUTION_DISABLED",
      status: 409,
    });
    expect(provider.read).not.toHaveBeenCalled();
    expect(provider.apply).not.toHaveBeenCalled();
  });

  it("requires OWNER for rollback before loading or touching remote state", async () => {
    const provider = { read: vi.fn(), apply: vi.fn() };
    await expect(rollbackOptimizationAction(
      "ws-1",
      "user-1",
      "ADMIN",
      "action-1",
      "rollback-idempotency-001",
      { provider, now: () => new Date("2026-08-11T12:00:00.000Z") }
    )).rejects.toMatchObject({ code: "OWNER_REQUIRED", status: 403 });
    expect(mocked.optimizationProposedAction.findFirst).not.toHaveBeenCalled();
    expect(provider.read).not.toHaveBeenCalled();
    expect(provider.apply).not.toHaveBeenCalled();
  });
});
