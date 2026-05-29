import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import crypto from "crypto";

export async function POST(
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
  const { email, role = "MEMBER" } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const validRoles = ["ADMIN", "MEMBER"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "Rol inválido. Usa ADMIN o MEMBER" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: existingUser.id },
      },
    });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "Este usuario ya es miembro del workspace" },
        { status: 409 }
      );
    }
  }

  await prisma.workspaceInvite.deleteMany({
    where: {
      workspaceId,
      email,
      acceptedAt: null,
      expires: { gt: new Date() },
    },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.workspaceInvite.create({
    data: { workspaceId, email, token, role, expires },
    include: { workspace: { select: { name: true } } },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

  console.log(`[INVITE] ${email} → ${inviteUrl}`);

  return NextResponse.json({
    data: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expires: invite.expires,
      inviteUrl,
      workspaceName: invite.workspace.name,
    },
  }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
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

  const invites = await prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expires: { gt: new Date() },
    },
    orderBy: { expires: "asc" },
  });

  return NextResponse.json({ data: invites });
}
