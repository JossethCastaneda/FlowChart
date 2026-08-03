import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiNotFound, apiForbidden } from "@/lib/api-response";
import { pickAssignee } from "@/lib/auto-assign";
import { parseWorkflow, findUserArea, getPermissions, estimateEtaHours, etaDate } from "@/lib/workflow-config";
import { notifyTaskAssigned } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { start } from "workflow/api";
import { slaEngineWorkflow } from "@/workflows/sla-engine";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateTaskSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(500).transform((s) => s.trim()),
  description: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  status: z.enum(["Backlog", "WIP", "Review", "Done"]).default("Backlog"),
  projectId: z.string().nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  tags: z.array(z.string()).default([]),
  parentId: z.string().nullable().optional(),
  targetAreaId: z.string().nullable().optional(),
  requestType: z.string().nullable().optional(),
  startDate: z.string().datetime({ offset: true }).nullable().optional(),
  estimate: z.number().nullable().optional(),
  blockedByIds: z.array(z.string()).default([]),
});

// GET /api/ops — list top-level tasks + workspace members
export const GET = withWorkspace(async (_req, ctx) => {
  const { workspaceId, userId, role } = ctx;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const [settings, member] = await Promise.all([
    prisma.workspaceSettings.findUnique({ where: { workspaceId } }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    }),
  ]);

  const config = parseWorkflow(settings || {});
  const ledAreaIds = config.areas
    .filter((a) => a.leadIds.includes(userId))
    .map((a) => a.id);
  const isGlobalViewer = role === "OWNER" || role === "ADMIN";

  const visibilityFilter = isGlobalViewer
    ? {}
    : {
        OR: [
          { createdBy: userId },
          { requesterId: userId },
          { assigneeId: userId },
          { targetAreaId: { in: ledAreaIds } },
        ],
      };

  const [tasks, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        workspaceId,
        parentId: null,
        ...visibilityFilter,
      },
      include: {
        children: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: { blockedBy: { select: { id: true } }, blocks: { select: { id: true } } },
        },
        blockedBy: { select: { id: true } },
        blocks: { select: { id: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      // Safety cap — prevents loading the entire table if a workspace
      // accumulates thousands of tasks (use cursor pagination for >500)
      take: 500,
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
  ]);

  const memberList = members.map((m) => ({
    id: m.user.id,
    name: m.user.name || m.user.email?.split("@")[0] || "Sin nombre",
    email: m.user.email,
    image: m.user.image,
    role: m.role,
    activityStatus: m.activityStatus || "disponible",
    lastActiveAt: m.lastActiveAt || null,
  }));

  return apiSuccess({ tasks, members: memberList });
});

// POST /api/ops — create a task
export const POST = withWorkspace(async (req, ctx) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const { workspaceId, userId, role } = ctx;

  const result = await validateBody(req, CreateTaskSchema);
  if (!result.ok) return result.response;
  const {
    title, description, assignee, assigneeId, priority, status,
    projectId, dueDate, tags, parentId, targetAreaId, requestType,
    startDate, estimate, blockedByIds,
  } = result.data;

  // ── Permission check ──
  const [settings, member] = await Promise.all([
    prisma.workspaceSettings.findUnique({ where: { workspaceId } }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    }),
  ]);
  const config = parseWorkflow(settings || {});
  const permArea = targetAreaId
    ? config.areas.find((a) => a.id === targetAreaId) || null
    : findUserArea(config, userId);
  const perms = getPermissions(permArea, userId, member?.role || "MEMBER");

  if (!perms.canAccessOps) {
    return apiForbidden("No tienes permiso para crear tareas en esta área");
  }

  // Validate parent task belongs to the same workspace
  if (parentId) {
    const parent = await prisma.task.findUnique({
      where: { id: parentId },
      select: { workspaceId: true },
    });
    if (!parent || parent.workspaceId !== workspaceId) {
      return apiNotFound("Tarea padre no encontrada");
    }
  }

  // Get next order value
  const lastTask = await prisma.task.findFirst({
    where: { workspaceId, parentId: parentId || null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (lastTask?.order ?? -1) + 1;

  // Cross-area request: auto-assign if no assignee specified
  let finalAssignee = assignee || null;
  let finalAssigneeId = assigneeId || null;
  if (targetAreaId && !finalAssigneeId && !finalAssignee) {
    const picked = await pickAssignee(targetAreaId, workspaceId);
    if (picked) {
      finalAssignee = picked.name;
      finalAssigneeId = picked.userId;
    }
  }

  // Auto-calculate SLA / dueDate if not provided
  let finalDueDate = dueDate ? new Date(dueDate) : null;
  if (!finalDueDate && (targetAreaId || finalAssignee || finalAssigneeId)) {
    let areaForSla = targetAreaId ? config.areas.find((a) => a.id === targetAreaId) : null;
    if (!areaForSla && (finalAssigneeId || finalAssignee)) {
      const assigneeMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          ...(finalAssigneeId ? { userId: finalAssigneeId } : {}),
        },
        select: { userId: true },
      });
      if (assigneeMember) {
        areaForSla = findUserArea(config, assigneeMember.userId) || null;
      }
    }

    if (areaForSla) {
      const ahead = await prisma.task.count({
        where: {
          workspaceId,
          status: { not: "Done" },
          ...(targetAreaId ? { targetAreaId } : { assigneeId: finalAssigneeId }),
        },
      });

      let sla = areaForSla.slaHours || 24;
      if (targetAreaId && requestType) {
        const rt = areaForSla.requestTypes.find((t) => t.id === requestType || t.name === requestType);
        if (rt?.slaHours) sla = rt.slaHours;
      }

      const hours = targetAreaId ? (ahead + 1) * sla : estimateEtaHours(ahead, areaForSla);
      finalDueDate = etaDate(hours);
    }
  }

  const task = await prisma.task.create({
    data: {
      workspaceId,
      title,
      description: description || null,
      assignee: finalAssignee,
      assigneeId: finalAssigneeId,
      priority,
      status,
      dueDate: finalDueDate,
      tags,
      order: nextOrder,
      projectId: projectId || null,
      parentId: parentId || null,
      targetAreaId: targetAreaId || null,
      requestType: requestType || null,
      requesterId: targetAreaId ? userId : null,
      createdBy: userId,
      startDate: startDate ? new Date(startDate) : null,
      estimate: estimate || null,
      ...(blockedByIds.length > 0 && {
        blockedBy: {
          connect: blockedByIds.map((id: string) => ({ id }))
        }
      })
    },
    include: { children: true, blockedBy: true, blocks: true },
  });

  logger.info("Task created", {
    taskId: task.id,
    workspaceId,
    targetAreaId: targetAreaId || null,
    byUserId: userId,
  });

  // Notify the assignee (fire-and-forget, non-blocking)
  if (task.assignee && task.assigneeId) {
    // Get creator name
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const creatorName = creator?.name || creator?.email?.split("@")[0] || "Un colaborador";

    notifyTaskAssigned({
      taskId: task.id,
      taskTitle: task.title,
      assigneeName: task.assignee,
      assigneeUserId: task.assigneeId,
      assignerName: creatorName,
      assignerUserId: userId,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() || null,
      workspaceId,
    }).catch((err) =>
      logger.warn("Notify task created failed", { taskId: task.id, error: err })
    );
  }

  // Lanzar SLA Engine si la tarea tiene un vencimiento
  if (task.dueDate) {
    const delayMs = task.dueDate.getTime() - Date.now();
    const delaySeconds = Math.max(0, Math.floor(delayMs / 1000));
    start(slaEngineWorkflow, [task.id, workspaceId, delaySeconds]).catch(err => 
      logger.warn("Failed to start SLA engine workflow", { taskId: task.id, error: err })
    );
  }

  return apiCreated({ task });
});
