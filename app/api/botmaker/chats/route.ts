import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  listChats,
  getChat,
  closeChat,
  assignChat,
  snoozeChat,
  getChatMessages,
} from "@/lib/botmaker-api";
import { z } from "zod";

/**
 * GET    /api/botmaker/chats?status=&channelId=&agentId=&limit=&cursor=  — lista chats
 * GET    /api/botmaker/chats?id=:chatId                                  — detalle chat
 * GET    /api/botmaker/chats?id=:chatId&messages=true                    — mensajes
 * POST   /api/botmaker/chats (action: close | assign | snooze)           — acciones
 */

const ChatActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("close"),
    chatId: z.string().min(1),
    typification: z.string().optional(),
    agentId: z.string().optional(),
  }),
  z.object({
    action: z.literal("assign"),
    chatId: z.string().min(1),
    agentId: z.string().min(1),
  }),
  z.object({
    action: z.literal("snooze"),
    chatId: z.string().min(1),
    until: z.string().datetime(),
  }),
]);

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);
  const sp = req.nextUrl.searchParams;

  const id = sp.get("id");

  if (id && sp.get("messages") === "true") {
    const data = await getChatMessages(bmConn, id, {
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
      cursor: sp.get("cursor") ?? undefined,
    });
    return apiSuccess(data);
  }

  if (id) {
    const result = await getChat(bmConn, id);
    if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
    return apiSuccess({ chat: result });
  }

  const statusParam = sp.get("status");
  const data = await listChats(bmConn, {
    status: statusParam as "open" | "closed" | "pending" | undefined,
    channelId: sp.get("channelId") ?? undefined,
    agentId: sp.get("agentId") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    cursor: sp.get("cursor") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });
  return apiSuccess(data);
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("JSON inválido", "PARSE_ERROR", 400); }

  const parsed = ChatActionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((e: {path: unknown[], message: string}) => `${e.path.join(".")}: ${e.message}`).join("; "),
      "VALIDATION_ERROR",
      400
    );
  }

  const data = parsed.data;
  switch (data.action) {
    case "close": {
      const result = await closeChat(bmConn, data.chatId, { typification: data.typification, agentId: data.agentId });
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ closed: true, chatId: data.chatId });
    }
    case "assign": {
      const result = await assignChat(bmConn, data.chatId, data.agentId);
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ assigned: true, chatId: data.chatId, agentId: data.agentId });
    }
    case "snooze": {
      const result = await snoozeChat(bmConn, data.chatId, data.until);
      if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
      return apiSuccess({ snoozed: true, chatId: data.chatId, until: data.until });
    }
  }
});

export const maxDuration = 30;
