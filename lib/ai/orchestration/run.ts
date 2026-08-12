import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";

export type RunStatus = "pending" | "running" | "completed" | "failed";
export type RunAction = "planner:propose_action" | "orchestrator:evaluate_context" | "tool:invoke";

/**
 * Structural definition of an AI Run.
 * In Phase P2, this will map directly to the `AiRun` Prisma model.
 * For Phase P1, it's used for structured memory logging and telemetry.
 */
export interface AiRun {
  id: string;
  workspaceId: string;
  action: RunAction;
  status: RunStatus;
  provider: string;
  model: string;
  promptVersion: string;
  startedAt: Date;
  endedAt?: Date;
  inputTokens: number;
  outputTokens: number;
  costEstimateUsd: number;
  error?: string;
  fallbackFrom?: string; // If this run was a fallback, the ID of the original model
}

/**
 * In-memory / Logger backed telemetry tracker for P1.
 */
export class TelemetryTracker {
  static createRun(
    workspaceId: string,
    action: RunAction,
    provider: string,
    model: string,
    promptVersion: string,
    fallbackFrom?: string
  ): AiRun {
    const run: AiRun = {
      id: `run_${uuidv4()}`,
      workspaceId,
      action,
      status: "pending",
      provider,
      model,
      promptVersion,
      startedAt: new Date(),
      inputTokens: 0,
      outputTokens: 0,
      costEstimateUsd: 0,
      fallbackFrom,
    };
    
    logger.info(`[AiRun] Started: ${run.id}`, { action, provider, model, workspaceId });
    return run;
  }

  static completeRun(run: AiRun, usage: { promptTokens: number; completionTokens: number; totalTokens: number }, cost: number) {
    run.status = "completed";
    run.endedAt = new Date();
    run.inputTokens = usage.promptTokens;
    run.outputTokens = usage.completionTokens;
    run.costEstimateUsd = cost;
    
    logger.info(`[AiRun] Completed: ${run.id}`, { 
      durationMs: run.endedAt.getTime() - run.startedAt.getTime(),
      tokens: usage.totalTokens,
      cost 
    });
  }

  static failRun(run: AiRun, error: Error) {
    run.status = "failed";
    run.endedAt = new Date();
    run.error = error.message;
    
    logger.error(`[AiRun] Failed: ${run.id}`, { 
      durationMs: run.endedAt.getTime() - run.startedAt.getTime(),
      error: error.message 
    });
  }
}
