import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { start } from "workflow/api";
import { syncIntegrationAssetsWorkflow } from "@/workflows/sync-integration-assets";
import { logger } from "@/lib/logger";

export const POST = withWorkspace(async (req: NextRequest, ctx: any) => {
  const body = await req.json().catch(() => ({}));
  const { integrationId } = body;
  
  if (integrationId) {
    // Verificar pertenencia
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, workspaceId: ctx.workspaceId }
    });

    if (!integration) {
      return apiError("Integration no encontrada en el workspace", "NOT_FOUND", 404);
    }

    try {
      await start(syncIntegrationAssetsWorkflow, [integration.id]);
      return apiSuccess({ message: "Sincronización en proceso. Esto puede tomar unos segundos." });
    } catch (error: any) {
      logger.error("Error al iniciar el workflow de sync", { route: "api/integrations/sync", error: error.message });
      return apiError("No se pudo iniciar la sincronización.", "INTERNAL_ERROR", 500);
    }
  } else {
    // Sincronizar todas las integraciones conectadas del workspace
    const integrations = await prisma.integration.findMany({
      where: { workspaceId: ctx.workspaceId, connected: true }
    });
    
    let started = 0;
    for (const integration of integrations) {
      try {
        await start(syncIntegrationAssetsWorkflow, [integration.id]);
        started++;
      } catch(e) {
        // Ignorar fallo de un workflow e intentar con el resto
      }
    }
    return apiSuccess({ message: `Sincronizando ${started} integraciones. Esto puede tomar unos minutos dependiendo del volumen de datos.` });
  }
});
