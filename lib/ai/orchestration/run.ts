import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { calculateProviderCost } from "../finops/pricing";

export type RunStatus = "pending" | "running" | "completed" | "failed";
export type RunAction = "planner:propose_action" | "orchestrator:evaluate_context" | "tool:invoke";

/**
 * Structural definition of an AI Run.
 */
export interface AiRunData {
  id: string;
  requestId: string;
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
  fallbackFrom?: string;
}

/**
 * Durable telemetry tracker using Prisma.
 */
export class TelemetryTracker {
  /**
   * For P1.5, we assume the requestId is known or generated dynamically if missing.
   * If not passed, we create an AiRequest dynamically to ensure the AiRun can link to it.
   */
  static async createRun(
    workspaceId: string,
    action: RunAction,
    provider: string,
    model: string,
    promptVersion: string,
    fallbackFrom?: string,
    requestId?: string
  ): Promise<AiRunData> {
    
    let activeRequestId = requestId;
    
    if (!activeRequestId) {
      const idempotencyKey = `auto-${Date.now()}-${Math.random()}`;
      const request = await prisma.aiRequest.create({
        data: {
          workspaceId,
          feature: action,
          status: "RUNNING",
          idempotencyKey,
        }
      });
      activeRequestId = request.id;
    }

    const dbRun = await prisma.aiRun.create({
      data: {
        requestId: activeRequestId,
        workspaceId,
        provider,
        model,
        actualProviderModelId: model,
        promptVersion,
        status: "RUNNING",
        fallbackFromRunId: fallbackFrom,
      }
    });

    const run: AiRunData = {
      id: dbRun.id,
      requestId: activeRequestId,
      workspaceId,
      action,
      status: "running",
      provider,
      model,
      promptVersion,
      startedAt: dbRun.startedAt,
      inputTokens: 0,
      outputTokens: 0,
      costEstimateUsd: 0,
      fallbackFrom: fallbackFrom ?? undefined,
    };
    
    logger.info(`[AiRun] Started: ${run.id}`, { action, provider, model, workspaceId });
    return run;
  }

  static async completeRun(run: AiRunData, usage: { promptTokens: number; completionTokens: number; totalTokens: number }) {
    run.status = "completed";
    run.endedAt = new Date();
    run.inputTokens = usage.promptTokens;
    run.outputTokens = usage.completionTokens;
    
    // Calculate provider cost using FinOps pricing
    const { cost } = await calculateProviderCost(run.provider, run.model, run.inputTokens, run.outputTokens);
    run.costEstimateUsd = cost ? cost.toNumber() : 0;
    
    await prisma.aiRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        completedAt: run.endedAt,
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        providerCost: cost,
      }
    });
    
    logger.info(`[AiRun] Completed: ${run.id}`, { 
      durationMs: run.endedAt.getTime() - run.startedAt.getTime(),
      tokens: usage.totalTokens,
      cost: run.costEstimateUsd 
    });
  }

  static async failRun(run: AiRunData, error: Error, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) {
    run.status = "failed";
    run.endedAt = new Date();
    run.error = error.message;
    
    let cost: number = 0;
    if (usage) {
      run.inputTokens = usage.promptTokens;
      run.outputTokens = usage.completionTokens;
      const calc = await calculateProviderCost(run.provider, run.model, run.inputTokens, run.outputTokens);
      cost = calc.cost ? calc.cost.toNumber() : 0;
      run.costEstimateUsd = cost;
    }
    
    await prisma.aiRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: run.endedAt,
        errorCode: error.message,
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        providerCost: cost > 0 ? cost : undefined,
      }
    });
    
    logger.error(`[AiRun] Failed: ${run.id}`, { 
      durationMs: run.endedAt.getTime() - run.startedAt.getTime(),
      error: error.message,
      cost
    });
  }
}
