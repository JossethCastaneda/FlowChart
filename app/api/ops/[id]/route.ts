import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { notifyTaskAssigned } from "@/lib/notifications";
import { updateAutoSLA } from "@/lib/sla-calculator";

// PATCH /api/ops/[id] — update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
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

    const body = await req.json();
    const { title, description, assignee, priority, status, dueDate, tags, order, parentId, attachments } = body;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(assignee !== undefined && { assignee }),
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task no encontrada" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(
      task.workspaceId, session.user.id, ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[OPS] DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
