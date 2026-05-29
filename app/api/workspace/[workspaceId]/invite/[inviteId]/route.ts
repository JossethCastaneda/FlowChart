import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; inviteId: string }> }
) {
  const session = await getServerSession(authOptions);
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

  await prisma.workspaceInvite.deleteMany({
    where: { id: inviteId, workspaceId },
  });

  return NextResponse.json({ success: true });
}
