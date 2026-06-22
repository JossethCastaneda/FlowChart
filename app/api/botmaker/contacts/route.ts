import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getBotmakerConnection, createConnection, listContacts, getContact, updateContact, setContactVariables, setContactTags } from "@/lib/botmaker-api";
import { z } from "zod";

/**
 * GET  /api/botmaker/contacts?q=&platform=&tag=&limit=&cursor=
 *      Lista contactos del bot.
 *
 * GET  /api/botmaker/contacts/:id
 *      Detalle de un contacto específico.
 *
 * PATCH /api/botmaker/contacts
 *       Actualiza nombre, email, tags o variables de un contacto.
 */

const UpdateContactSchema = z.object({
  platformContactId: z.string().min(1),
  platform: z.string().min(1),
  channelId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");

  if (id) {
    const result = await getContact(bmConn, id);
    if (!result.ok) return apiError(result.message, "BOTMAKER_ERROR", 502);
    return apiSuccess({ contact: result.contact });
  }

  const page = await listContacts(bmConn, {
    q: sp.get("q") ?? undefined,
    platform: sp.get("platform") ?? undefined,
    tag: sp.get("tag") ?? undefined,
    status: sp.get("status") ?? undefined,
    limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    cursor: sp.get("cursor") ?? undefined,
  });
  return apiSuccess(page);
});

export const PATCH = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) return apiError("Botmaker no conectado", "NOT_CONNECTED", 400);
  const bmConn = createConnection(conn.accessToken, conn.baseUrl);

  let body: unknown;
  try { body = await req.json(); } catch { return apiError("JSON inválido", "PARSE_ERROR", 400); }

  const parsed = UpdateContactSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      parsed.error.issues.map((e: {path: unknown[], message: string}) => `${e.path.join(".")}: ${e.message}`).join("; "),
      "VALIDATION_ERROR",
      400
    );
  }
  const { removeTags, ...data } = parsed.data;

  // Variables update
  if (data.variables && Object.keys(data.variables).length) {
    const vRes = await setContactVariables(bmConn, {
      platformContactId: data.platformContactId,
      platform: data.platform,
      channelId: data.channelId,
      variables: data.variables as Record<string, string | number | boolean | null>,
    });
    if (!vRes.ok) return apiError(vRes.message, "BOTMAKER_ERROR", 502);
  }

  // Tags add/remove
  if ((data.tags?.length || removeTags?.length)) {
    await setContactTags(bmConn, {
      platformContactId: data.platformContactId,
      platform: data.platform,
      channelId: data.channelId,
      addTags: data.tags,
      removeTags,
    });
  }

  // Profile fields update
  const profileFields = ["name", "email", "phone"] as const;
  const hasProfile = profileFields.some((f) => data[f] !== undefined);
  if (hasProfile) {
    const uRes = await updateContact(bmConn, {
      platformContactId: data.platformContactId,
      platform: data.platform,
      channelId: data.channelId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      tags: data.tags,
      variables: data.variables as Record<string, string | number | boolean | null> | undefined,
    });
    if (!uRes.ok) return apiError(uRes.message, "BOTMAKER_ERROR", 502);
    return apiSuccess({ updated: true, contact: uRes });
  }

  return apiSuccess({ updated: true });
});

export const maxDuration = 30;
