import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET  /api/botmaker/connect  — check if Botmaker is connected for the workspace
 * DELETE /api/botmaker/connect — disconnect (mark connected=false)
 */

export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const integration = await prisma.integration.findUnique({
    where: {
      workspaceId_provider_userId: {
        workspaceId: ctx.workspaceId,
        provider: "botmaker",
        userId: "workspace",
      },
    },
    select: {
      connected: true,
      connectedAt: true,
      connectedBy: true,
      connectedUser: { select: { name: true, email: true, image: true } },
      credentials: true,
    },
  });

  if (!integration?.connected) {
    return apiSuccess({ connected: false });
  }

  const creds = (integration.credentials as Record<string, unknown>) || {};

  return apiSuccess({
    connected: true,
    connectedAt: integration.connectedAt,
    connectedBy: integration.connectedUser
      ? { name: integration.connectedUser.name, email: integration.connectedUser.email }
      : null,
    baseUrl: (creds.baseUrl as string) ?? null,
  });
});

export const DELETE = withWorkspace(async (_req: NextRequest, ctx) => {
  const integration = await prisma.integration.findUnique({
    where: {
      workspaceId_provider_userId: {
        workspaceId: ctx.workspaceId,
        provider: "botmaker",
        userId: "workspace",
      },
    },
    select: { id: true },
  });

  if (!integration) {
    return apiError("No hay integración de Botmaker conectada", "NOT_FOUND", 404);
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { connected: false },
  });

  return apiSuccess({ disconnected: true });
});

export const maxDuration = 15;
