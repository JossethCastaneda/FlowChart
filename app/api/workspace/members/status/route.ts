import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

const VALID_STATUSES = ["disponible", "ocupado", "ausente", "offline"];

/**
 * PUT /api/workspace/members/status
 * Allows a user to update their own activity status within their active workspace.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Estatus inválido. Opciones: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId: session.user.id },
      },
      data: {
        activityStatus: status,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({
      activityStatus: updated.activityStatus,
      lastActiveAt: updated.lastActiveAt,
    });
  } catch (err: any) {
    console.error("[MEMBER_STATUS] PUT error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

/**
 * GET /api/workspace/members/status
 * Returns the current user's activity status.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: session.user.id },
      },
      select: { activityStatus: true, lastActiveAt: true },
    });

    return NextResponse.json({
      activityStatus: member?.activityStatus || "disponible",
      lastActiveAt: member?.lastActiveAt || null,
    });
  } catch (err: any) {
    console.error("[MEMBER_STATUS] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
