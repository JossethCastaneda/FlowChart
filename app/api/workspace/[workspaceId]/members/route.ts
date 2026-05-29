import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
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
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { role: "asc" },
  });

  return NextResponse.json({ data: members });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const hasAccess = await verifyWorkspaceAccess(
    workspaceId,
    session.user.id,
    ["OWNER", "ADMIN"]
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const targetMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!targetMember) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  if (targetMember.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "No puedes eliminar al único OWNER del workspace" },
        { status: 400 }
      );
    }
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  return NextResponse.json({ success: true });
}
