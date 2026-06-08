import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { pickAssignee } from "@/lib/auto-assign";
import { parseWorkflow, findUserArea, getPermissions } from "@/lib/workflow-config";

// GET /api/ops — list tasks + workspace members
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ data: [], members: [] });
    }

    // Fetch top-level tasks (no parent) with their children
    const tasks = await prisma.task.findMany({
      where: { workspaceId, parentId: null },
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
    const session = await getServerSession(authOptions);
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
    const { title, description, assignee, priority, status, projectId, dueDate, tags, parentId, targetAreaId, requestType } = body;

    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    // ── Permission check: canCreateTasks ──
    const settings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
    const config = parseWorkflow(settings || {});
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    // Determine the area to check permissions against: the target area (cross-area
    // request) or the user's own area.
    const permArea = targetAreaId
      ? config.areas.find((a) => a.id === targetAreaId) || null
      : findUserArea(config, session.user.id);
    const perms = getPermissions(permArea, session.user.id, member?.role || "MEMBER");
    if (!perms.canCreateTasks) {
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
    if (targetAreaId && !finalAssignee) {
      const picked = await pickAssignee(targetAreaId, workspaceId);
      if (picked) finalAssignee = picked.name;
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        title: title.trim(),
        description: description || null,
        assignee: finalAssignee,
        priority: priority || "P2",
        status: status || "Backlog",
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags || [],
        order: nextOrder,
        projectId: projectId || null,
        parentId: parentId || null,
        // Cross-area request: server stamps the requester (the creator).
        targetAreaId: targetAreaId || null,
        requestType: requestType || null,
        requesterId: targetAreaId ? session.user.id : null,
      },
      include: { children: true },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err: any) {
    console.error("[OPS] POST error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
