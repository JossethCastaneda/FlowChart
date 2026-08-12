import { z } from "zod";
import { logger } from "@/lib/logger";
import { buildOptimizationContext } from "./context-builder";
import { generateOptimizationPlan } from "./planner";
import { evaluatePlan } from "./evaluator";
import { TelemetryTracker } from "@/lib/ai/orchestration/run";
import { 
  CreateSnapshotSchema, 
  CreateObjectiveSchema, 
  CreateProposedActionSchema 
} from "../contracts";

type Snapshot = z.infer<typeof CreateSnapshotSchema>;
type Objective = z.infer<typeof CreateObjectiveSchema>;
type ProposedAction = z.infer<typeof CreateProposedActionSchema>;

/**
 * Orchestrates the full AI Optimization Pipeline (Phase P1).
 * Flow: Raw Data -> Minimized Context -> AI Plan -> Deterministic Evaluation -> Safe Proposed Actions
 */
export async function orchestrateOptimization(
  workspaceId: string,
  snapshot: Snapshot,
  objective: Objective
): Promise<ProposedAction[]> {
  logger.info("[Orchestrator] Starting optimization cycle", { workspaceId, snapshotId: snapshot.clientId });

  // 1. Build Context
  const context = buildOptimizationContext(snapshot, objective);

  // 2. Generate Plan
  let plan;
  try {
    plan = await generateOptimizationPlan(workspaceId, context);
  } catch (error) {
    logger.error("[Orchestrator] AI Planner failed", { workspaceId, error });
    throw new Error("Failed to generate optimization plan");
  }

  // 3. Evaluate Plan
  const run = await TelemetryTracker.createRun(
    workspaceId,
    "orchestrator:evaluate_context",
    "system", // Evaluator is deterministic software
    "evaluator-v1",
    "v1"
  );

  const evaluation = evaluatePlan(plan, context);
  
  if (!evaluation.accepted) {
    logger.warn("[Orchestrator] Plan rejected by Evaluator", { workspaceId, reason: evaluation.rejectionReason });
    await TelemetryTracker.failRun(run, new Error(evaluation.rejectionReason));
    return [];
  }

  await TelemetryTracker.completeRun(run, { promptTokens: 0, completionTokens: 0, totalTokens: 0 });

  // 4. Transform Validated Plan into ProposedActions (P0 Contract)
  const proposedActions: ProposedAction[] = evaluation.validatedActions.map(action => ({
    clientId: snapshot.clientId,
    snapshotId: "snap-TODO", // In a real flow, snapshot would have an ID
    provider: "meta", // Hardcoded for P1 simplicity, would be inferred from entity
    accountId: "acc-TODO",
    entity: {
      type: action.entity.type as "campaign" | "group" | "ad",
      id: action.entity.id
    },
    field: action.actionType === "PAUSE_CAMPAIGN" ? "status" : "status",
    currentValue: "ACTIVE",
    proposedValue: "PAUSED",
    unit: "enum",
    expectedImpact: action.expectedImpact,
    uncertaintyInterval: { low: 0, high: 0, level: 0 }, // Mocked for P1
    risk: "low",
    evidence: action.evidence.map(e => ({
      id: `ev-${Date.now()}`,
      source: "ai_planner",
      locator: e
    })),
    rollbackCondition: { previousStatus: "ACTIVE" },
    idempotencyKey: `ik-${Date.now()}`,
    remoteStateFingerprint: "fingerprint-TODO",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    requiredApproverRole: "ADMIN",
    state: "requires_review"
  }));

  logger.info(`[Orchestrator] Produced ${proposedActions.length} safe actions`, { workspaceId });
  return proposedActions;
}
