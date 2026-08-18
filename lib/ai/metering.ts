import prisma from "@/lib/prisma";
import { checkPlanLimit } from "@/lib/plan-limits";
import { logger } from "@/lib/logger";

/**
 * Revisa si el workspace ha excedido el límite de generaciones de IA en su plan.
 * Se asume que el conteo se hace para el mes actual.
 * Devuelve un objeto `{ allowed: boolean, message: string }`.
 */
export async function checkAiLimit(workspaceId: string): Promise<{ allowed: boolean; message: string }> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });
    
    if (!workspace) return { allowed: false, message: "Workspace no encontrado" };
    
    // Conteo del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageCount = await prisma.aiUsage.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth }
      }
    });

    const limit = checkPlanLimit(workspace.plan, "aiGenerations", usageCount);
    
    if (limit.exceeded) {
      return { allowed: false, message: limit.message };
    }
    
    return { allowed: true, message: "" };
  } catch (err) {
    logger.error("[METERING] Error checkAiLimit", { workspaceId, error: String(err) });
    return { allowed: false, message: "Error verificando cuota de IA. Por seguridad, la solicitud fue bloqueada." }; // Fail-closed
  }
}

/**
 * Registra una generación de IA consumida.
 */
export async function recordAiUsage(
  workspaceId: string,
  route: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  opts?: {
    provider?: string;
    feature?: string;
  }
) {
  try {
    // Legacy estimatedCostUsd is intentionally not accepted here: it is neither
    // proven provider cost nor an approved customer charge.
    const data: Record<string, unknown> = {
      workspaceId,
      route,
      model,
      tokensIn,
      tokensOut,
    };
    if (opts?.provider) data.provider = opts.provider;
    if (opts?.feature) data.feature = opts.feature;

    const usageData = data as import("@prisma/client").Prisma.AiUsageUncheckedCreateInput;
    await prisma.aiUsage.create({ data: usageData });
  } catch (err) {
    logger.error("[METERING] Error al guardar AiUsage", { workspaceId, route, error: String(err) });
  }
}
