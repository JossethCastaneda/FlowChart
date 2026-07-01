/**
 * POST /api/crecimiento/train — entrena un modelo real sobre las filas del dataset.
 *
 * Delega TODO al motor determinista (runTrainingPipeline): perfila, divide
 * train/test, entrena regresión logística + scorecard WOE, evalúa, elige el mejor
 * por AUC, predice y persiste métricas y scores reales. Reemplaza la simulación
 * (Math.random / AUC hardcodeado) anterior.
 */

import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError, apiServerError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { runTrainingPipeline } from "@/lib/crecimiento/engine/pipeline";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ datasetId: z.string().min(1) });

export const POST = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const parsed = await validateBody(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  try {
    const dataset = await prisma.ariaDataset.findFirst({
      where: { id: parsed.data.datasetId, workspaceId: ctx.workspaceId },
      select: { id: true },
    });
    if (!dataset) return apiError("Dataset no encontrado", "NOT_FOUND", 404);
    const result = await runTrainingPipeline(dataset.id);
    return apiSuccess(result);
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/train POST");
  }
});
