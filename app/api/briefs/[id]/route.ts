import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

// GET /api/briefs/[id] — get a single brief
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const brief = await prisma.brief.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, alias: true } },
      },
    });
    if (!brief) {
      return NextResponse.json({ error: "Brief no encontrado" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(brief.workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: brief });
  } catch (err: any) {
    console.error("[BRIEFS] GET/id error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// PATCH /api/briefs/[id] — update a brief
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
    const brief = await prisma.brief.findUnique({ where: { id } });
    if (!brief) {
      return NextResponse.json({ error: "Brief no encontrado" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(brief.workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, status, projectId } = body;

    const updated = await prisma.brief.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content }),
        ...(status !== undefined && { status }),
        ...(projectId !== undefined && { projectId }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[BRIEFS] PATCH error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// DELETE /api/briefs/[id] — delete a brief
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
    const brief = await prisma.brief.findUnique({ where: { id } });
    if (!brief) {
      return NextResponse.json({ error: "Brief no encontrado" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(
      brief.workspaceId, session.user.id, ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.brief.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[BRIEFS] DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
