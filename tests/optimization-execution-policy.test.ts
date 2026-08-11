import { describe, expect, it } from "vitest";
import {
  computeActionFingerprint,
  parseExecutionApprovalPolicy,
  summarizeApprovals,
  validateExecutableAction,
  type ExecutableAction,
} from "../lib/optimization/execution/policy";
import { remoteStateFingerprint } from "../lib/optimization/execution/provider";

const action: ExecutableAction = {
  id: "action-1",
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
  remoteStateFingerprint: "remote-fingerprint",
};

describe("controlled optimization execution policy", () => {
  it("only admits the first reversible action surface", () => {
    expect(validateExecutableAction(action)).toEqual({
      ok: true,
      entity: { type: "campaign", id: "456" },
    });
    expect(validateExecutableAction({ ...action, field: "daily_budget" })).toMatchObject({
      ok: false,
      code: "FIELD_NOT_EXECUTABLE",
    });
    expect(validateExecutableAction({ ...action, provider: "tiktok" })).toMatchObject({
      ok: false,
      code: "PROVIDER_NOT_EXECUTABLE",
    });
  });

  it("fails closed when the snapshot has no executable approval policy", () => {
    expect(parseExecutionApprovalPolicy(null)).toMatchObject({ executionEnabled: false, requiredRoles: ["OWNER"] });
    expect(parseExecutionApprovalPolicy({ approvalPolicy: { executionEnabled: true, requiredRoles: ["ADMIN"], minimumApprovals: 2 } })).toMatchObject({
      executionEnabled: true,
      requiredRoles: ["ADMIN"],
      minimumApprovals: 2,
    });
  });

  it("uses only the latest decision per approver and binds it to the action fingerprint", () => {
    const fingerprint = computeActionFingerprint(action);
    const policy = parseExecutionApprovalPolicy({
      approvalPolicy: {
        executionEnabled: true,
        requiredRoles: ["OWNER", "ADMIN"],
        minimumApprovals: 1,
        highRiskMinimumApprovals: 2,
      },
    });
    const summary = summarizeApprovals(action, [
      { approverId: "user-1", approverRole: "ADMIN", decision: "approved", actionFingerprint: fingerprint, createdAt: new Date("2026-08-11T12:01:00Z") },
      { approverId: "user-1", approverRole: "ADMIN", decision: "rejected", actionFingerprint: fingerprint, createdAt: new Date("2026-08-11T12:00:00Z") },
      { approverId: "user-2", approverRole: "OWNER", decision: "rejected", actionFingerprint: "stale-fingerprint", createdAt: new Date("2026-08-11T12:02:00Z") },
    ], policy);
    expect(summary).toMatchObject({ approved: true, rejected: false, approvalCount: 1, requiredApprovalCount: 1 });
  });

  it("normalizes account identifiers when deriving the remote fingerprint", () => {
    const base = { provider: "meta", accountId: "act_123", entity: { type: "campaign" as const, id: "456" }, field: "status" as const };
    expect(remoteStateFingerprint(base, "ACTIVE")).toBe(remoteStateFingerprint({ ...base, accountId: "123" }, "ACTIVE"));
    expect(remoteStateFingerprint(base, "ACTIVE")).not.toBe(remoteStateFingerprint(base, "PAUSED"));
  });
});
