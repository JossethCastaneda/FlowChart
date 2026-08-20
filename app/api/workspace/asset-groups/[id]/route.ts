import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiNotFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";

const AssetSchema = z.object({
  provider: z.string().min(1),
  externalId: z.string().min(1),
});

export const PATCH = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.assetGroup.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) return apiNotFound("Grupo no encontrado");

  const parsed = await validateBody(
    req,
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      color: z.string().optional(),
      type: z.enum(["publish", "respond"]).optional(),
      assets: z.array(AssetSchema).min(1).optional(),
    })
  );
  if (!parsed.ok) return parsed.response;
  const { name, description, color, type, assets } = parsed.data;

  const group = await prisma.assetGroup.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(assets !== undefined ? { assets } : {}),
      updatedAt: new Date(),
    },
  });

  return apiSuccess(group);
});

export const DELETE = withWorkspace(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.assetGroup.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) return apiNotFound("Grupo no encontrado");

  await prisma.assetGroup.delete({ where: { id } });
  return apiSuccess({ deleted: true });
});
