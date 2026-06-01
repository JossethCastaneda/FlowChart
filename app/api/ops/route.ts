import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

// GET /api/ops — list tasks for the active workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ data: [] });
    }

    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: tasks });
  } catch (err: any) {
    console.error("[OPS] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// POST /api/ops — create a task
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
    const { title, description, assignee, priority, status, projectId } = body;

    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        title: title.trim(),
        description: description || null,
        assignee: assignee || null,
        priority: priority || "P2",
        status: status || "Backlog",
        projectId: projectId || null,
      },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (err: any) {
    console.error("[OPS] POST error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
