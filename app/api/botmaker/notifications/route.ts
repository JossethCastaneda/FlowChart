import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  sendNotification,
  listNotifications,
  cancelNotification,
} from "@/lib/botmaker-api";
import { z } from "zod";

/**
 * GET    /api/botmaker/notifications?status=&limit=&cursor=  — lista campañas
 * POST   /api/botmaker/notifications                         — enviar campaña
 * DELETE /api/botmaker/notifications?id=:notificationId     — cancelar campaña
 */

const RecipientSchema = z.object({
  platformContactId: z.string().min(1),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const SendNotificationSchema = z.object({
  ruleNameOrId: z.string().min(1),
  chatChannelNumber: z.string().min(1),
  chatPlatform: z.string().optional(),
  recipients: z.array(RecipientSchema).min(1, "Debe haber al menos 1 destinatario"),
  globalVariables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  campaignName: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);
  const sp = req.nextUrl.searchParams;

  const page = await listNotifications(bmConn, {
    status: sp.get("status") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    cursor: sp.get("cursor") ?? undefined,
  });
  return apiSuccess(page);
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("JSON inválido", "PARSE_ERROR", 400); }

  const parsed = SendNotificationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((e: {path: unknown[], message: string}) => `${e.path.join(".")}: ${e.message}`).join("; "),
      "VALIDATION_ERROR",
      400
    );
  }

  const d = parsed.data;
  const result = await sendNotification(bmConn, {
    ruleNameOrId: d.ruleNameOrId,
    chatChannelNumber: d.chatChannelNumber,
    chatPlatform: d.chatPlatform,
    campaignName: d.campaignName,
    scheduledAt: d.scheduledAt,
    globalVariables: d.globalVariables as Record<string, string | number | boolean | null> | undefined,
    recipients: d.recipients.map(r => ({
      platformContactId: r.platformContactId,
      variables: r.variables as Record<string, string | number | boolean | null> | undefined,
    })),
  });
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({
    notificationId: result.notificationId,
    status: result.status,
    queued: result.queued,
    failed: result.failed,
    recipientCount: parsed.data.recipients.length,
  });
});

export const DELETE = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("Parámetro id requerido", "MISSING_FIELD", 400);

  const result = await cancelNotification(bmConn, id);
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({ cancelled: true });
});

export const maxDuration = 60;
