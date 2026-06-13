import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

// GET /api/ops/[id]/comments — get comments + activity for a task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasAccess = await verifyWorkspaceAccess(task.workspaceId, session.user.id);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    return NextResponse.json({ comments, activities });
  } catch (err: any) {
    console.error("[COMMENTS] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

// POST /api/ops/[id]/comments — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id }, select: { workspaceId: true } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasAccess = await verifyWorkspaceAccess(task.workspaceId, session.user.id);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Contenido vacio" }, { status: 400 });
    }

    const userName = session.user.name || session.user.email?.split("@")[0] || "Usuario";

    const [comment] = await Promise.all([
      prisma.taskComment.create({
        data: {
          taskId: id,
          userId: session.user.id,
          userName,
          userImage: session.user.image || null,
          content: content.trim(),
        },
      }),
      prisma.taskActivity.create({
        data: {
          taskId: id,
          userId: session.user.id,
          userName,
          action: "commented",
          newValue: content.trim().slice(0, 100),
        },
      }),
    ]);

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err: any) {
    console.error("[COMMENTS] POST error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
