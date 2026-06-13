import prisma from "@/lib/prisma";

// Solo OWNER/ADMIN del workspace pueden configurar el módulo (spec §5.3, §36).
export async function isWorkspaceAdmin(workspaceId: string, userId: string): Promise<boolean> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return !!membership && ["OWNER", "ADMIN"].includes(membership.role);
}
