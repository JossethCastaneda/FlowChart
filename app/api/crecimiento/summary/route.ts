import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiServerError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (_req, ctx) => {
  try {
    const where = { dataset: { workspaceId: ctx.workspaceId } };
    const [modelsCount, totalLeadsAnalizados, highIntentLeads, bestModel] = await Promise.all([
      prisma.ariaModel.count({ where }),
      prisma.ariaPrediction.count({ where: { model: where } }),
      prisma.ariaPrediction.count({ where: { model: where, priority: "High" } }),
      prisma.ariaModel.findFirst({
        where: { ...where, status: "ready", auc: { not: null } },
        orderBy: { auc: "desc" },
        select: { runs: { orderBy: { createdAt: "desc" }, take: 1, select: { metrics: true } } },
      }),
    ]);

    // Lift real (no hardcodeado): liftAtDecile del mejor modelo entrenado.
    let lift = "—";
    const run = bestModel?.runs?.[0];
    if (run?.metrics && typeof run.metrics === "object" && !Array.isArray(run.metrics)) {
      const m = run.metrics as Record<string, unknown>;
      if (typeof m.liftAtDecile === "number" && Number.isFinite(m.liftAtDecile)) {
        lift = `${m.liftAtDecile.toFixed(1)}x`;
      }
    }

    return apiSuccess({ modelsCount, totalLeadsAnalizados, highIntentLeads, lift });
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/summary GET");
  }
});
