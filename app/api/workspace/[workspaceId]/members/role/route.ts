import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(
      workspaceId, session.user.id, ["OWNER"]
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Solo el OWNER puede cambiar roles" },
        { status: 403 }
      );
    }
    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId y role son requeridos" },
        { status: 400 }
      );
    }
    if (!["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Usa OWNER, ADMIN o MEMBER" },
        { status: 400 }
      );
    }
    // No puedes cambiar tu propio rol
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 400 }
      );
    }
    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!target) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      );
    }
    // Proteger: si el target es OWNER, verificar que no sea el único
    if (target.role === "OWNER" && role !== "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "No puedes quitar el rol de OWNER al único propietario" },
          { status: 400 }
        );
      }
    }
    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[MEMBERS] Role change error:", err);
    return NextResponse.json(
      { error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
