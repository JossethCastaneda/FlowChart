import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

export const GET = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const rules = await prisma.analyticsOutcomeRule.findMany({
    where: { workspaceId }
  });

  return apiSuccess(rules);
});

export const POST = withAuth(async (req, ctx) => {
  const workspaceId = await getActiveWorkspaceId(ctx.userId);
  if (!workspaceId) return apiError("Workspace no encontrado", "NO_WORKSPACE", 400);

  const body = await req.json();
  const { name, conditions, outcome, resolvedBy } = body;

  if (!name || !conditions || !outcome || !resolvedBy) {
    return apiError("Faltan parámetros", "BAD_REQUEST", 400);
  }

  const rule = await prisma.analyticsOutcomeRule.create({
    data: {
      workspaceId,
      name,
      conditions: JSON.stringify(conditions), // Guardamos como string JSON o Json nativo
      outcome,
      resolvedBy
    }
  });

  return apiSuccess(rule);
});
