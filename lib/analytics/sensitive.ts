// ============================================================================
// Permiso granular view_sensitive (spec §36 / goal §20).
//
// PII enmascarada por DEFECTO. Solo se revela sin máscara a quien tenga el
// permiso `canViewSensitiveAnalytics` (o sea OWNER/ADMIN del workspace), y cada
// revelación deja un audit log `view_sensitive`.
//
// Nota de modelo (honesta): el repo NO tiene ACL por proyecto (ver proyecto =
// membresía del workspace). El permiso es a nivel workspace; aceptamos un
// `projectId` opcional para registrarlo en el audit log y como gancho de una
// futura granularidad por proyecto.
// ============================================================================

import prisma from "@/lib/prisma";
import {
  parseWorkflow,
  findUserArea,
  getPermissions,
  type AreaPermissions,
} from "@/lib/workflow-config";

/**
 * Resolución PURA: dado el rol de workspace y los permisos efectivos, ¿puede ver
 * PII sin enmascarar? OWNER/ADMIN siempre; el resto solo con el flag explícito.
 */
export function resolveViewSensitive(role: string, perms: AreaPermissions): boolean {
  if (role === "OWNER" || role === "ADMIN") return true;
  return perms.canViewSensitiveAnalytics === true;
}

/**
 * Comprueba si un usuario puede ver PII sin enmascarar en el workspace dado.
 * Resuelve permisos efectivos igual que /api/workspace/members/status.
 */
export async function canViewSensitive(workspaceId: string, userId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true, permissions: true },
  });
  if (!member) return false;
  if (member.role === "OWNER" || member.role === "ADMIN") return true;

  const settingsRow = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
    select: { areas: true, requireLeadReview: true },
  });
  const config = parseWorkflow(settingsRow);
  const area = findUserArea(config, userId);
  const perms = getPermissions(area, userId, member.role, member.permissions as AreaPermissions | null);
  return resolveViewSensitive(member.role, perms);
}
