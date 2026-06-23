import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  listWebhooks,
  createWebhook,
  deleteWebhook,
  healthCheck,
  BM_WEBHOOK_EVENTS,
} from "@/lib/botmaker-api";
import { z } from "zod";

/**
 * GET    /api/botmaker/settings                              — health + webhooks
 * POST   /api/botmaker/settings?action=create-webhook        — registrar webhook
 * DELETE /api/botmaker/settings?action=delete-webhook&id=   — eliminar webhook
 */

const CreateWebhookSchema = z.object({
  url: z.string().url("URL de webhook inválida"),
  events: z.array(z.string()).min(1, "Selecciona al menos un evento"),
  channelId: z.string().optional(),
  secret: z.string().optional(),
});

export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const [health, webhooks] = await Promise.all([
    healthCheck(bmConn),
    listWebhooks(bmConn),
  ]);

  return apiSuccess({
    health,
    webhooks,
    availableEvents: BM_WEBHOOK_EVENTS,
  });
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const action = req.nextUrl.searchParams.get("action");
  if (action !== "create-webhook") {
    return apiError("Acción no reconocida. Usa action=create-webhook", "UNKNOWN_ACTION", 400);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("JSON inválido", "PARSE_ERROR", 400); }

  const parsed = CreateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((e: {path: unknown[], message: string}) => `${e.path.join(".")}: ${e.message}`).join("; "),
      "VALIDATION_ERROR",
      400
    );
  }

  const result = await createWebhook(bmConn, parsed.data);
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({ webhook: result });
});

export const DELETE = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("Parámetro id requerido", "MISSING_FIELD", 400);

  const result = await deleteWebhook(bmConn, id);
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({ deleted: true, webhookId: id });
});

export const maxDuration = 30;
