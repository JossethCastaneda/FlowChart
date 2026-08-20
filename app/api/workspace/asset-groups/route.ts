import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * GET/POST /api/workspace/asset-groups
 *
 * CRUD sobre AssetGroup — el modelo ya existía en el schema (usado en
 * producción para agrupar canales de publicación), pero nunca tuvo una ruta
 * de API real: AssetGroupManager.tsx y el quick-pick "Por grupo" del
 * Composer llamaban a esta ruta y recibían 404 en silencio.
 */

const AssetSchema = z.object({
  provider: z.string().min(1),
  externalId: z.string().min(1),
});

export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const groups = await prisma.assetGroup.findMany({
    where: { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  // "Última publicación" por grupo: ScheduledPost solo guarda un pageId de
  // Facebook por post (no un igId de cuenta), así que solo se puede atribuir con
  // certeza para grupos con al menos un asset de Facebook. Para grupos solo-IG
  // se deja null en vez de adivinar con un post que podría ser de otra cuenta.
  const facebookPageIds = Array.from(
    new Set(
      groups.flatMap((g) =>
        Array.isArray(g.assets)
          ? (g.assets as Array<{ provider?: string; externalId?: string }>)
              .filter((a) => a?.provider === "facebook" && a.externalId)
              .map((a) => a.externalId as string)
          : []
      )
    )
  );

  const lastPosts = facebookPageIds.length
    ? await prisma.scheduledPost.groupBy({
        by: ["pageId"],
        where: { workspaceId: ctx.workspaceId, status: "Published", pageId: { in: facebookPageIds } },
        _max: { publishedAt: true },
      })
    : [];
  const lastPublishedByPageId = new Map(lastPosts.map((p) => [p.pageId, p._max.publishedAt]));

  const withLastPublished = groups.map((g) => {
    const pageIds = Array.isArray(g.assets)
      ? (g.assets as Array<{ provider?: string; externalId?: string }>)
          .filter((a) => a?.provider === "facebook" && a.externalId)
          .map((a) => a.externalId as string)
      : [];
    const dates = pageIds.map((id) => lastPublishedByPageId.get(id)).filter((d): d is Date => !!d);
    const lastPublishedAt = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    return { ...g, lastPublishedAt };
  });

  return apiSuccess(withLastPublished);
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const parsed = await validateBody(
    req,
    z.object({
      name: z.string().min(1, "El nombre es obligatorio"),
      description: z.string().optional(),
      color: z.string().optional(),
      type: z.enum(["publish", "respond"]).optional(),
      assets: z.array(AssetSchema).min(1, "Selecciona al menos un canal"),
    })
  );
  if (!parsed.ok) return parsed.response;
  const { name, description, color, type, assets } = parsed.data;

  const group = await prisma.assetGroup.create({
    data: {
      id: randomUUID(),
      workspaceId: ctx.workspaceId,
      name: name.trim(),
      description: description?.trim() || null,
      color: color || "#35D3D9",
      type: type || "publish",
      assets,
      updatedAt: new Date(),
    },
  });

  return apiSuccess(group, 201);
});
