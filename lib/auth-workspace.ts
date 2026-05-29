import prisma from "@/lib/prisma";

export async function verifyWorkspaceAccess(workspaceId: string, userId: string, requiredRole: string[] = ["ADMIN", "MEMBER"]) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!membership) return false;
  if (!requiredRole.includes(membership.role)) return false;

  return true;
}

export async function verifyProjectAccess(projectId: string, userId: string, requiredRole: string[] = ["ADMIN", "MEMBER"]) {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!membership) return false;
  if (!requiredRole.includes(membership.role)) return false;

  return true;
}
