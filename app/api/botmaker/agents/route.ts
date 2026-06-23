import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from "@/lib/botmaker-api";
import { z } from "zod";

/**
 * GET    /api/botmaker/agents?limit=&cursor=        — lista agentes
 * GET    /api/botmaker/agents?id=:agentId           — detalle agente
 * POST   /api/botmaker/agents                       — crear agente
 * PATCH  /api/botmaker/agents?id=:agentId           — actualizar agente
 * DELETE /api/botmaker/agents?id=:agentId           — eliminar agente
 */

const CreateAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional(),
  channelIds: z.array(z.string()).optional(),
  password: z.string().optional(),
});

const UpdateAgentSchema = CreateAgentSchema.partial();

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");

  if (id) {
    const result = await getAgent(bmConn, id);
    if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
    return apiSuccess({ agent: result });
  }

  const page = await listAgents(bmConn, {
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
  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((e: {path: unknown[], message: string}) => `${e.path}: ${e.message}`).join("; "), "VALIDATION_ERROR", 400);

  const result = await createAgent(bmConn, parsed.data);
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({ agent: result });
});

export const PATCH = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("Parámetro id requerido", "MISSING_FIELD", 400);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("JSON inválido", "PARSE_ERROR", 400); }
  const parsed = UpdateAgentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((e: {path: unknown[], message: string}) => `${e.path}: ${e.message}`).join("; "), "VALIDATION_ERROR", 400);

  const result = await updateAgent(bmConn, id, parsed.data);
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({ agent: result });
});

export const DELETE = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("Parámetro id requerido", "MISSING_FIELD", 400);

  const result = await deleteAgent(bmConn, id);
  if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
  return apiSuccess({ deleted: true });
});

export const maxDuration = 30;
