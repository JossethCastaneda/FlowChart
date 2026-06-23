import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const KeyResultSchema = z.object({
  title: z.string().min(1).max(500),
  targetValue: z.number().min(0).default(100),
  unit: z.string().default("%"),
});

const CreateObjectiveSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(500).transform((s) => s.trim()),
  description: z.string().nullable().optional(),
  quarter: z.string().default(""),
  areaId: z.string().nullable().optional(),
  keyResults: z.array(KeyResultSchema).default([]),
});

// GET /api/ops/okrs — list OKRs for the active workspace
export const GET = withWorkspace(async (_req, ctx) => {
  const objectives = await prisma.objective.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      keyResults: {
        include: {
          tasks: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(objectives);
});

// POST /api/ops/okrs — create an OKR
export const POST = withWorkspace(async (req, ctx) => {
  const result = await validateBody(req, CreateObjectiveSchema);
  if (!result.ok) return result.response;

  const { title, description, quarter, areaId, keyResults } = result.data;

  const objective = await prisma.objective.create({
    data: {
      workspaceId: ctx.workspaceId,
      title,
      description: description ?? null,
      quarter,
      areaId: areaId ?? null,
      keyResults: {
        create: keyResults.map((kr) => ({
          title: kr.title,
          targetValue: kr.targetValue,
          unit: kr.unit,
        })),
      },
    },
    include: { keyResults: true },
  });

  logger.info("OKR created", {
    objectiveId: objective.id,
    workspaceId: ctx.workspaceId,
    byUserId: ctx.userId,
  });

  return apiCreated(objective);
});
