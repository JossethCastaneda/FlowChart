import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; inviteId: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, inviteId } = await params;
    const hasAccess = await verifyWorkspaceAccess(
      workspaceId,
      session.user.id,
      ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.workspaceInvite.deleteMany({
      where: { id: inviteId, workspaceId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[INVITE DELETE] Error:", err);
    return NextResponse.json(
      { error: "Error al cancelar invitación" },
      { status: 500 }
    );
  }
}
