import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiNotFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const PATCH = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.mediaAsset.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) return apiNotFound("Archivo no encontrado");

  const parsed = await validateBody(req, z.object({ tags: z.array(z.string().trim().min(1)).max(20) }));
  if (!parsed.ok) return parsed.response;

  const asset = await prisma.mediaAsset.update({
    where: { id },
    data: { tags: parsed.data.tags },
  });

  return apiSuccess(asset);
});

export const DELETE = withWorkspace(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.mediaAsset.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) return apiNotFound("Archivo no encontrado");

  await prisma.mediaAsset.delete({ where: { id } });
  return apiSuccess({ deleted: true });
});
