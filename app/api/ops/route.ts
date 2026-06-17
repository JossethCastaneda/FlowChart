import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { pickAssignee } from "@/lib/auto-assign";
import { parseWorkflow, findUserArea, getPermissions, estimateEtaHours, etaDate } from "@/lib/workflow-config";

// GET /api/ops — list tasks + workspace members
export async function GET() {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ data: [], members: [] });
    }

    // Prepare visibility filters based on roles and areas
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
    const config = parseWorkflow(settings || {});
    
    const ledAreaIds = config.areas.filter((a) => a.leadIds.includes(session.user.id)).map((a) => a.id);
    const role = member?.role || "MEMBER";
    const isGlobalViewer = role === "OWNER" || role === "ADMIN";

    const visibilityFilter = isGlobalViewer
      ? {} // Owners and Admins see all tasks
      : {
          OR: [
            { createdBy: session.user.id },
            { requesterId: session.user.id },
            { assigneeId: session.user.id },
            // Legacy support for older tasks
            { assignee: session.user.name || "N/A" },
            // Leader sees all tasks directed to their area
            { targetAreaId: { in: ledAreaIds } },
          ],
        };

    // Fetch top-level tasks (no parent) with their children
    const tasks = await prisma.task.findMany({
      where: { 
        workspaceId, 
        parentId: null,
        ...visibilityFilter
      },
      include: {
        children: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    // Fetch workspace members for People column
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    const memberList = members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email?.split("@")[0] || "Sin nombre",
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      activityStatus: m.activityStatus || "disponible",
      lastActiveAt: m.lastActiveAt || null,
    }));

    return NextResponse.json({ data: tasks, members: memberList });
  } catch (err: any) {
    console.error("[OPS] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// POST /api/ops — create a task or subitem
export async function POST(req: NextRequest) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No tienes workspace activo" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, assignee, assigneeId, priority, status, projectId, dueDate, tags, parentId, targetAreaId, requestType } = body;

    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    // ── Permission check: canCreateTasks ──
    const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
    const config = parseWorkflow(settings || {});
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    // Determine the area to check permissions against: the target area (cross-area request) or the user's own area.
    const permArea = targetAreaId
      ? config.areas.find((a) => a.id === targetAreaId) || null
      : findUserArea(config, session.user.id);
    const perms = getPermissions(permArea, session.user.id, member?.role || "MEMBER");
    if (!perms.canAccessOps) {
      return NextResponse.json({ error: "No tienes permiso para crear tareas en esta área" }, { status: 403 });
    }

    // If creating a subitem, verify parent exists
    if (parentId) {
      const parent = await prisma.task.findUnique({ where: { id: parentId } });
      if (!parent || parent.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Tarea padre no encontrada" }, { status: 404 });
      }
    }

    // Get next order value
    const lastTask = await prisma.task.findFirst({
      where: { workspaceId, parentId: parentId || null },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastTask?.order ?? -1) + 1;

    // Cross-area request: auto-assign if no assignee specified.
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
            ...(finalAssigneeId ? { userId: finalAssigneeId } : { user: { name: finalAssignee } })
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
        title: title.trim(),
        description: description || null,
        assignee: finalAssignee,
        assigneeId: finalAssigneeId,
        priority: priority || "P2",
        status: status || "Backlog",
        dueDate: finalDueDate,
        tags: tags || [],
        order: nextOrder,
        projectId: projectId || null,
        parentId: parentId || null,
        targetAreaId: targetAreaId || null,
        requestType: requestType || null,
        // Cross-area request: server stamps the requester (the creator).
        requesterId: targetAreaId ? session.user.id : null,
        createdBy: session.user.id,
      },
      include: { children: true },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err: any) {
    console.error("[OPS] POST error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
