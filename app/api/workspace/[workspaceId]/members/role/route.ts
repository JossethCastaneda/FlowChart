import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

const VALID_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
type Role = typeof VALID_ROLES[number];

export async function PATCH(
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
    ["OWNER"]
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "Solo el OWNER puede cambiar roles" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json(
      { error: "userId y role válido son requeridos (OWNER, ADMIN, MEMBER)" },
      { status: 400 }
    );
  }

  if (role !== "OWNER") {
    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (target?.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "No puedes degradar al único OWNER" },
          { status: 400 }
        );
      }
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
}
