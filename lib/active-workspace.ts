import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const ACTIVE_WORKSPACE_COOKIE = "flowchart_active_workspace";

/**
 * Obtiene el workspaceId activo del usuario.
 * Orden de prioridad:
 *   1. Cookie flowchart_active_workspace (si existe y es válida)
 *   2. Primer workspace del usuario (fallback)
 * Retorna null si el usuario no tiene workspaces.
 */
export async function getActiveWorkspaceId(
  userId: string
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  // Validar que la cookie apunte a un workspace al que pertenece
  if (cookieValue) {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: cookieValue,
          userId,
        },
      },
      select: { workspaceId: true },
    });
    if (membership) return membership.workspaceId;
  }

  // Fallback: primer workspace del usuario
  const firstMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { workspace: { createdAt: "asc" } },
    select: { workspaceId: true },
  });
  return firstMembership?.workspaceId ?? null;
}
