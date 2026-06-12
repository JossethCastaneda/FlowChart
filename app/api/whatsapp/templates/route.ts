/**
 * app/api/whatsapp/templates/route.ts
 *
 * GET — Lista los templates aprobados del WABA asociado al workspace activo.
 *
 * Respuesta:
 *   { templates: WaTemplate[], connected: boolean }
 *
 * Los templates se cachean 5 minutos en Next.js cache (fetch revalidate).
 * Requiere sesión + workspace activo (withWorkspace).
 */

import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getWaCredentials, listWaTemplates } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const { workspaceId } = ctx;

  const creds = await getWaCredentials(workspaceId);
  if (!creds) {
    return apiSuccess({ templates: [], connected: false });
  }

  try {
    const templates = await listWaTemplates(creds);
    return apiSuccess({ templates, connected: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error obteniendo templates";
    logger.error("WA listTemplates error", { workspaceId, error: err });
    return apiError(msg, "WA_TEMPLATES_ERROR", 502);
  }
});
