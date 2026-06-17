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
  if (membership) {
    return requiredRole.includes(membership.role as WorkspaceRole);
  }

  // Fallback para legacy workspaces donde el owner no está en WorkspaceMember
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (workspace && workspace.ownerId === userId) {
    return requiredRole.includes("OWNER");
  }

  return false;
}

export async function getUserRoleInWorkspace(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (membership) return membership.role as WorkspaceRole;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (workspace && workspace.ownerId === userId) return "OWNER";

  return null;
}

export async function verifyProjectAccess(
  projectId: string,
  userId: string,
  requiredRole: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"]
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) return false;

  return verifyWorkspaceAccess(project.workspaceId, userId, requiredRole);
}
