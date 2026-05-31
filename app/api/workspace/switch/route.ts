import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await req.json();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Missing workspaceId" },
      { status: 400 }
    );
  }

  // Verificar que el usuario pertenece a ese workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id,
      },
    },
    include: {
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "No tienes acceso a este workspace" },
      { status: 403 }
    );
  }

  // Setear cookie httpOnly con el nuevo workspace activo
  const response = NextResponse.json({
    success: true,
    workspace: membership.workspace,
  });

  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 año
    path: "/",
  });

  return response;
}
