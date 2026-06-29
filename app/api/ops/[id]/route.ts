import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiNotFound, apiForbidden, apiError, apiServerError } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { notifyTaskAssigned, notifyTaskStatusChanged, notifyTaskPriorityChanged } from "@/lib/notifications";
import { updateAutoSLA } from "@/lib/sla-calculator";
import { parseWorkflow, findUserArea, getPermissions } from "@/lib/workflow-config";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { z } from "zod";

const PatchTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  status: z.enum(["Backlog", "WIP", "Review", "Done"]).optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  tags: z.array(z.string()).optional(),
  order: z.number().int().optional(),
  parentId: z.string().nullable().optional(),
  attachments: z.array(z.unknown()).optional(),
});

// PATCH /api/ops/[id] — update a task
export const PATCH = withAuth(async (req, ctx) => {
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return apiNotFound("Tarea no encontrada");

  const hasAccess = await verifyWorkspaceAccess(task.workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const result = await validateBody(req, PatchTaskSchema);
  if (!result.ok) return result.response;
  let { title, description, assignee, assigneeId, priority, status, dueDate, tags, order, parentId, attachments } = result.data;

  // ── Permission check ──
  const [settings, member] = await Promise.all([
    prisma.workspaceSettings.findUnique({ where: { workspaceId: task.workspaceId } }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: ctx.userId } },
      include: { user: { select: { name: true } } },
    }),
  ]);
  const config = parseWorkflow(settings || {});
  const permArea = task.targetAreaId
    ? config.areas.find((a) => a.id === task.targetAreaId) || null
    : findUserArea(config, ctx.userId);
  const perms = getPermissions(permArea, ctx.userId, member?.role || "MEMBER");

  if (!perms.canAccessOps) {
    return apiForbidden("No tienes permiso para acceder a Ops");
  }

  // Editing rules: OWNER/ADMIN, area leaders, assignees, or creator in Backlog
  const isGlobal = member?.role === "OWNER" || member?.role === "ADMIN";
  const ledAreaIds = config.areas.filter((a) => a.leadIds.includes(ctx.userId)).map((a) => a.id);
  const isLeader = task.targetAreaId ? ledAreaIds.includes(task.targetAreaId) : false;
  const isAssignee = task.assigneeId === ctx.userId;
  const isCreator = task.createdBy === ctx.userId || task.requesterId === ctx.userId;
  const creatorCanEdit = isCreator && task.status === "Backlog";

  if (!isGlobal && !isLeader && !isAssignee && !creatorCanEdit) {
    return apiForbidden(
      "Edición bloqueada: Solo el responsable, líderes de área o el creador (en Backlog) pueden editar esta tarea."
    );
  }

  // Auto-reassign to Area Lead when moving to Review
  if (status === "Review" && task.status !== "Review") {
    const isLead = permArea?.leadIds.includes(ctx.userId) || isGlobal;
    if (!isLead && permArea && permArea.leadIds.length > 0) {
      const leadMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: task.workspaceId, userId: permArea.leadIds[0] },
        include: { user: { select: { id: true, name: true } } },
      });
      if (leadMember?.user?.name) {
        assignee = leadMember.user.name;
        assigneeId = leadMember.user.id;
      }
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(assignee !== undefined && { assignee }),
      ...(assigneeId !== undefined && { assigneeId }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(tags !== undefined && { tags: { set: tags } }),
      ...(order !== undefined && { order }),
      // parentId must use Prisma's set: syntax for nullable relations
      ...(parentId !== undefined && { parentId: parentId ?? null }),
      ...(attachments !== undefined && { attachments: attachments as object[] }),
      // Stamp closedAt when transitioning to Done; clear when leaving Done
      ...(status === "Done" && task.status !== "Done" && { closedAt: new Date() }),
      ...(status !== undefined && status !== "Done" && task.status === "Done" && { closedAt: null }),
    } as Parameters<typeof prisma.task.update>[0]["data"],
    include: { children: true },
  });

  // Log activity for meaningful field changes
  const userName = ctx.userId; // userId is sufficient for audit
  const activities: { action: string; field: string; oldValue: string | null; newValue: string | null }[] = [];
  if (status !== undefined && status !== task.status)
    activities.push({ action: "status_changed", field: "status", oldValue: task.status, newValue: status });
  if (assignee !== undefined && assignee !== task.assignee)
    activities.push({ action: "assigned", field: "assignee", oldValue: task.assignee, newValue: assignee || null });
  if (priority !== undefined && priority !== task.priority)
    activities.push({ action: "priority_changed", field: "priority", oldValue: task.priority, newValue: priority });

  if (activities.length > 0) {
    await prisma.taskActivity.createMany({
      data: activities.map((a) => ({
        taskId: id,
        userId: ctx.userId,
        userName: member?.user?.name ?? ctx.userId,
        ...a,
      })),
    });
  }

  // Fire-and-forget notifications (non-blocking)
  const actorName = member?.user?.name ?? ctx.userId;

  if (assignee !== undefined && assignee !== task.assignee && assignee) {
    // Assignee changed
    notifyTaskAssigned({
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeName: assignee,
      assigneeUserId: assigneeId ?? updated.assigneeId ?? undefined,
      assignerName: actorName,
      assignerUserId: ctx.userId,
      priority: updated.priority,
      dueDate: updated.dueDate?.toISOString() || null,
      workspaceId: task.workspaceId,
    }).catch((err) =>
      logger.warn("Notify task assigned failed", { taskId: id, error: err })
    );
  }

  if (status !== undefined && status !== task.status && updated.assignee) {
    // Status changed
    notifyTaskStatusChanged({
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeName: updated.assignee,
      assigneeUserId: updated.assigneeId ?? null,
      updaterName: actorName,
      updaterUserId: ctx.userId,
      newStatus: updated.status,
      workspaceId: task.workspaceId,
    }).catch((err) =>
      logger.warn("Notify task status changed failed", { taskId: id, error: err })
    );
  }

  if (priority !== undefined && priority !== task.priority && updated.assignee) {
    // Priority changed
    notifyTaskPriorityChanged({
      taskId: updated.id,
      taskTitle: updated.title,
      assigneeName: updated.assignee,
      assigneeUserId: updated.assigneeId ?? null,
      updaterName: actorName,
      updaterUserId: ctx.userId,
      newPriority: updated.priority,
      oldPriority: task.priority,
      workspaceId: task.workspaceId,
    }).catch((err) =>
      logger.warn("Notify task priority changed failed", { taskId: id, error: err })
    );
  }

  // Trigger auto-SLA recalculation when a task is closed
  if (status === "Done" && task.status !== "Done" && task.targetAreaId) {
    updateAutoSLA(task.targetAreaId, task.workspaceId).catch((err) =>
      logger.warn("Auto-SLA update failed", { taskId: id, targetAreaId: task.targetAreaId, error: err })
    );
  }

  return apiSuccess(updated);
});

// DELETE /api/ops/[id] — delete a task (cascades to children)
export const DELETE = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return apiNotFound("Tarea no encontrada");

  const hasAccess = await verifyWorkspaceAccess(task.workspaceId, ctx.userId);
  if (!hasAccess) return apiForbidden();

  const [settings, member] = await Promise.all([
    prisma.workspaceSettings.findUnique({ where: { workspaceId: task.workspaceId } }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: ctx.userId } },
    }),
  ]);

  const config = parseWorkflow(settings || {});
  const isGlobal = member?.role === "OWNER" || member?.role === "ADMIN";
  const ledAreaIds = config.areas.filter((a) => a.leadIds.includes(ctx.userId)).map((a) => a.id);
  const isLeader = task.targetAreaId ? ledAreaIds.includes(task.targetAreaId) : false;
  const isCreator = task.createdBy === ctx.userId || task.requesterId === ctx.userId;
  const creatorCanDelete = isCreator && task.status === "Backlog";

  if (!isGlobal && !isLeader && !creatorCanDelete) {
    return apiForbidden(
      "Eliminación bloqueada: Solo líderes de área o el creador (en Backlog) pueden eliminar tareas."
    );
  }

  await prisma.task.delete({ where: { id } });

  logger.info("Task deleted", { taskId: id, workspaceId: task.workspaceId, byUserId: ctx.userId });

  return apiSuccess({ deleted: true });
});
