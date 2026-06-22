import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  listWaTemplates,
  getWaTemplate,
} from "@/lib/botmaker-api";

/**
 * GET /api/botmaker/templates?channelId=&status=
 *     Lista plantillas de WhatsApp.
 *
 * GET /api/botmaker/templates?name=:templateName
 *     Detalle de una plantilla por nombre.
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);
  const sp = req.nextUrl.searchParams;

  const name = sp.get("name");
  if (name) {
    const result = await getWaTemplate(bmConn, name);
    if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
    return apiSuccess({ template: result });
  }

  const templates = await listWaTemplates(bmConn, {
    channelId: sp.get("channelId") ?? undefined,
    status: sp.get("status") ?? undefined,
  });
  return apiSuccess({ templates, count: templates.length });
});

export const maxDuration = 30;
