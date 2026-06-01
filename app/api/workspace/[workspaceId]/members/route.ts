import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { role: "asc" },
    });
    return NextResponse.json({ data: members });
  } catch (err: any) {
    console.error("[MEMBERS] Error:", err);
    return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 });
  }
}

export async function DELETE(
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
      workspaceId, session.user.id, ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!target) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Get the requesting user's role
    const requester = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    // ADMIN can only remove MEMBERs. Only OWNER can remove ADMINs/OWNERs.
    if (requester?.role === "ADMIN" && target.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Solo el OWNER puede eliminar ADMINs u OWNERs" },
        { status: 403 }
      );
    }

    if (target.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "No puedes eliminar al único OWNER" },
          { status: 400 }
        );
      }
    }
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[MEMBERS] Delete error:", err);
    return NextResponse.json({ error: "Error al eliminar miembro" }, { status: 500 });
  }
}
