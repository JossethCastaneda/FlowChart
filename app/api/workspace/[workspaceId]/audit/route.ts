import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspace/[workspaceId]/audit — registro de auditoría del workspace
 * (cambios de rol/permisos, remoción de miembros, conexión/desconexión de
 * integraciones, …). Solo OWNER/ADMIN. Paginado por cursor.
 */
export const GET = withAuth(async (req: NextRequest, ctx) => {
  const { workspaceId } = await ctx.params;

  const hasAccess = await verifyWorkspaceAccess(workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!hasAccess) return apiForbidden("Solo OWNER/ADMIN pueden ver la auditoría");

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || undefined;
  const limitRaw = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
  const cursor = searchParams.get("cursor") || undefined;

  const rows = await prisma.auditLog.findMany({
    where: { workspaceId, ...(action ? { action } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return apiSuccess({
    events: page.map((e) => ({
      id: e.id,
      action: e.action,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      details: e.details,
      actor: e.user ? { id: e.user.id, name: e.user.name, email: e.user.email, image: e.user.image } : null,
      createdAt: e.createdAt,
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id : null,
  });
});
