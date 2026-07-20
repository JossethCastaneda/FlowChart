import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { Prisma } from "@/lib/prisma";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateBriefSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(500).transform((s) => s.trim()),
  content: z.record(z.string(), z.unknown()).optional().default({}),
  projectId: z.string().nullable().optional(),
  status: z.enum(["Draft", "Review", "Approved"]).default("Draft"),
});

// GET /api/briefs — list briefs for the active workspace
export const GET = withWorkspace(async (_req, ctx) => {
  const briefs = await prisma.brief.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      project: { select: { id: true, name: true, alias: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(briefs);
});

// POST /api/briefs — create a brief
export const POST = withWorkspace(async (req, ctx) => {
  const result = await validateBody(req, CreateBriefSchema);
  if (!result.ok) return result.response;
  const { title, content, projectId, status } = result.data;

  // SEGURIDAD: validar que el projectId (si viene) pertenece a ESTE workspace. Sin esto
  // un brief podía referenciar un proyecto de otro workspace (y filtrar su nombre en el GET).
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: ctx.workspaceId },
      select: { id: true },
    });
    if (!project) {
      return apiError("El proyecto indicado no pertenece a este workspace", "INVALID_PROJECT", 400);
    }
  }

  const brief = await prisma.brief.create({
    data: {
      workspaceId: ctx.workspaceId,
      title,
      content: (content ?? {}) as Prisma.InputJsonValue,
      projectId: projectId || null,
      status,
    },
  });

  logger.info("Brief created", { briefId: brief.id, workspaceId: ctx.workspaceId, byUserId: ctx.userId });

  return apiCreated(brief);
});
