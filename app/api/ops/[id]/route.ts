import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { notifyTaskAssigned, notifyTaskStatusChanged } from "@/lib/notifications";
import { updateAutoSLA } from "@/lib/sla-calculator";
import { parseWorkflow, findUserArea, getPermissions } from "@/lib/workflow-config";

// PATCH /api/ops/[id] — update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task no encontrada" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(task.workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Permission check: canEditTasks / canCloseTasks ──
    const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId: task.workspaceId } });
    const config = parseWorkflow(settings || {});
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: session.user.id } },
    });
    // Check against the task's target area, or the user's own area
    const permArea = task.targetAreaId
      ? config.areas.find((a) => a.id === task.targetAreaId) || null
      : findUserArea(config, session.user.id);
    const perms = getPermissions(permArea, session.user.id, member?.role || "MEMBER");
    if (!perms.canAccessOps) {
      return NextResponse.json({ error: "No tienes permiso para acceder a Ops" }, { status: 403 });
    }

    // STRICT EDITING RULES
    const isGlobalViewer = member?.role === "OWNER" || member?.role === "ADMIN";
    const ledAreaIds = config.areas.filter((a) => a.leadIds.includes(session.user.id)).map((a) => a.id);
    const isLeader = task.targetAreaId ? ledAreaIds.includes(task.targetAreaId) : false;
    const isAssignee = task.assigneeId === session.user.id || task.assignee === (session.user.name || "N/A");
    const isCreator = task.createdBy === session.user.id || task.requesterId === session.user.id;
    const creatorCanEdit = isCreator && task.status === "Backlog";

    if (!isGlobalViewer && !isLeader && !isAssignee && !creatorCanEdit) {
      return NextResponse.json({ error: "Edición bloqueada: Solo el responsable (asignado), líderes de área o el creador (en Backlog) pueden editar esta tarea." }, { status: 403 });
    }

    const body = await req.json();
    let { title, description, assignee, assigneeId, priority, status, dueDate, tags, order, parentId, attachments } = body;

    // Auto-reassign to Area Lead if moving to Review by non-lead
    if (status === "Review" && task.status !== "Review") {
      const isLead = permArea?.leadIds.includes(session.user.id) || member?.role === "OWNER" || member?.role === "ADMIN";
      if (!isLead && permArea && permArea.leadIds.length > 0) {
        // Find the lead user member to get their name and id
        const leadMember = await prisma.workspaceMember.findFirst({
          where: { workspaceId: task.workspaceId, userId: permArea.leadIds[0] },
          include: { user: true }
        });
        if (leadMember?.user?.name) {
          assignee = leadMember.user.name;
          assigneeId = leadMember.user.id;
        }
      }
    }

    // If transitioning to "Done", also require canAccessOps permission
    if (status === "Done" && task.status !== "Done" && !perms.canAccessOps) {
      return NextResponse.json({ error: "No tienes permiso para cerrar tareas en esta área" }, { status: 403 });
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
        ...(tags !== undefined && { tags }),
        ...(order !== undefined && { order }),
        ...(parentId !== undefined && { parentId }),
        ...(attachments !== undefined && { attachments }),
        // Stamp closedAt when transitioning to Done; clear when leaving Done
        ...(status === "Done" && task.status !== "Done" && { closedAt: new Date() }),
        ...(status !== undefined && status !== "Done" && task.status === "Done" && { closedAt: null }),
      },
      include: { children: true },
    });

    // Log activity for meaningful field changes
    const userName = session.user?.name || session.user?.email?.split("@")[0] || "Usuario";
    const activities: { action: string; field: string; oldValue: string | null; newValue: string | null }[] = [];
    if (status !== undefined && status !== task.status) activities.push({ action: "status_changed", field: "status", oldValue: task.status, newValue: status });
    if (assignee !== undefined && assignee !== task.assignee) activities.push({ action: "assigned", field: "assignee", oldValue: task.assignee, newValue: assignee || null });
    if (priority !== undefined && priority !== task.priority) activities.push({ action: "priority_changed", field: "priority", oldValue: task.priority, newValue: priority });

    if (activities.length > 0) {
      await prisma.taskActivity.createMany({
        data: activities.map(a => ({ taskId: id, userId: session.user.id, userName, ...a })),
      });
    }

    // Send notification if assignee changed
    if (assignee !== undefined && assignee !== task.assignee && assignee) {
      notifyTaskAssigned({
        taskId: updated.id,
        taskTitle: updated.title,
        assigneeName: assignee,
        assignerName: session.user?.name || session.user?.email || "Alguien",
        assignerUserId: session.user.id,
        priority: updated.priority,
        dueDate: updated.dueDate?.toISOString() || null,
      }).catch(err => console.error("[OPS] Notification error:", err));
    } else if (status !== undefined && status !== task.status && updated.assignee) {
      // Send notification if status changed and it wasn't a reassignment
      notifyTaskStatusChanged({
        taskId: updated.id,
        taskTitle: updated.title,
        assigneeName: updated.assignee,
        updaterName: session.user?.name || session.user?.email || "Alguien",
        updaterUserId: session.user.id,
        newStatus: updated.status,
      }).catch(err => console.error("[OPS] Status Notification error:", err));
    }

    // Trigger auto-SLA recalculation when a task is closed
    if (status === "Done" && task.status !== "Done" && task.targetAreaId) {
      updateAutoSLA(task.targetAreaId, task.workspaceId).catch((err) =>
        console.error("[OPS] Auto-SLA update error:", err)
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[OPS] PATCH error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// DELETE /api/ops/[id] — delete a task (cascades to children)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task no encontrada" }, { status: 404 });
    }

    // First check basic workspace membership
    const hasAccess = await verifyWorkspaceAccess(task.workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Permission check: canEditTasks (or OWNER/ADMIN via getPermissions) ──
    const delSettings = await prisma.workspaceSettings.findUnique({ where: { workspaceId: task.workspaceId } });
    const delConfig = parseWorkflow(delSettings || {});
    const delMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: session.user.id } },
    });
    const delPermArea = task.targetAreaId
      ? delConfig.areas.find((a) => a.id === task.targetAreaId) || null
      : findUserArea(delConfig, session.user.id);
    const delPerms = getPermissions(delPermArea, session.user.id, delMember?.role || "MEMBER");
    
    // STRICT DELETE RULES
    const isGlobalViewer = delMember?.role === "OWNER" || delMember?.role === "ADMIN";
    const ledAreaIds = delConfig.areas.filter((a) => a.leadIds.includes(session.user.id)).map((a) => a.id);
    const isLeader = task.targetAreaId ? ledAreaIds.includes(task.targetAreaId) : false;
    const isCreator = task.createdBy === session.user.id || task.requesterId === session.user.id;
    const creatorCanDelete = isCreator && task.status === "Backlog";

    if (!isGlobalViewer && !isLeader && !creatorCanDelete) {
      return NextResponse.json({ error: "Eliminación bloqueada: Solo líderes de área o el creador (en Backlog) pueden eliminar tareas." }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[OPS] DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
