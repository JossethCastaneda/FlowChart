import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

// GET /api/briefs — list briefs for the active workspace
export async function GET() {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ data: [] });
    }

    const briefs = await prisma.brief.findMany({
      where: { workspaceId },
      include: {
        project: { select: { id: true, name: true, alias: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: briefs });
  } catch (err: any) {
    console.error("[BRIEFS] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// POST /api/briefs — create a brief
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
    const { title, content, projectId, status } = body;

    if (!title || typeof title !== "string" || title.trim().length < 1) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }

    const brief = await prisma.brief.create({
      data: {
        workspaceId,
        title: title.trim(),
        content: content || {},
        projectId: projectId || null,
        status: status || "Draft",
      },
    });

    return NextResponse.json({ data: brief }, { status: 201 });
  } catch (err: any) {
    console.error("[BRIEFS] POST error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
