import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/publisher/settings — configuración del módulo Publisher del workspace.
 * PUT — activar/desactivar el flujo de aprobación de publicaciones (OWNER/ADMIN).
 */
export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });
  const ext = (settings?.extConfig as Record<string, unknown> | null) || {};
  return apiSuccess({ requirePostApproval: ext.requirePostApproval === true });
});

const PublisherSettingsSchema = z.object({
  requirePostApproval: z.boolean(),
});

export const PUT = withWorkspaceRole(["OWNER", "ADMIN"])(async (req: NextRequest, ctx) => {
  const parsed = await validateBody(req, PublisherSettingsSchema);
  if (!parsed.ok) return parsed.response;

  const current = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { extConfig: true },
  });
  const ext = (current?.extConfig as Record<string, unknown> | null) || {};
  const updatedExt = { ...ext, requirePostApproval: parsed.data.requirePostApproval };

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: ctx.workspaceId },
    create: { workspaceId: ctx.workspaceId, extConfig: updatedExt as Prisma.InputJsonValue },
    update: { extConfig: updatedExt as Prisma.InputJsonValue },
  });

  return apiSuccess({ requirePostApproval: parsed.data.requirePostApproval });
});
