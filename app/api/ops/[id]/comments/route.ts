import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

const AddCommentSchema = z.object({
  content: z.string().min(1, "El contenido no puede estar vacío").max(5000),
});

// GET /api/ops/[id]/comments — get comments + activity for a task
export const GET = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!task) return apiNotFound("Tarea no encontrada");

  const hasAccess = await verifyWorkspaceAccess(task.workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const [comments, activities] = await Promise.all([
    prisma.taskComment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskActivity.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return apiSuccess({ comments, activities });
});

// POST /api/ops/[id]/comments — add a comment
export const POST = withAuth(async (req, ctx) => {
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({
    where: { id },
    select: { workspaceId: true },
  });
  if (!task) return apiNotFound("Tarea no encontrada");

  const hasAccess = await verifyWorkspaceAccess(task.workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const result = await validateBody(req, AddCommentSchema);
  if (!result.ok) return result.response;
  const { content } = result.data;

  // Get the user's display name for the comment
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true, image: true },
  });
  const userName = user?.name || user?.email?.split("@")[0] || "Usuario";

  const [comment] = await Promise.all([
    prisma.taskComment.create({
      data: {
        taskId: id,
        userId: ctx.userId,
        userName,
        userImage: user?.image || null,
        content,
      },
    }),
    prisma.taskActivity.create({
      data: {
        taskId: id,
        userId: ctx.userId,
        userName,
        action: "commented",
        newValue: content.slice(0, 100),
      },
    }),
  ]);

  return apiCreated(comment);
});
