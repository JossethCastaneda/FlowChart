import prisma from "@/lib/prisma";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export async function verifyWorkspaceAccess(
  workspaceId: string,
  userId: string,
  requiredRole: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"]
): Promise<boolean> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) return false;
  return requiredRole.includes(membership.role as WorkspaceRole);
}

export async function getUserRoleInWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return (membership?.role as WorkspaceRole) || null;
}

export async function verifyProjectAccess(
  projectId: string,
  userId: string,
  requiredRole: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"]
): Promise<boolean> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) return false;
  return requiredRole.includes(membership.role as WorkspaceRole);
}
