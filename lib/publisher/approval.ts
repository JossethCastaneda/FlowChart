/**
 * lib/publisher/approval.ts — Flujo de aprobación de publicaciones (opt-in por workspace).
 *
 * Feature de equipo/agencia (paridad Hootsuite): cuando un workspace activa
 * `requirePostApproval`, los posts creados por MEMBERs quedan en `approvalStatus:"pending"`
 * y NO se programan/publican hasta que un OWNER/ADMIN los apruebe. Los OWNER/ADMIN
 * publican directo (su propia creación se auto-aprueba).
 *
 * El flag vive en WorkspaceSettings.extConfig.requirePostApproval (default false → el
 * comportamiento actual no cambia si no se activa).
 */

import prisma from "@/lib/prisma";

/** ¿El workspace exige aprobación antes de programar/publicar? */
export async function workspaceRequiresApproval(workspaceId: string): Promise<boolean> {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
    select: { extConfig: true },
  });
  const ext = (settings?.extConfig as Record<string, unknown> | null) || {};
  return ext.requirePostApproval === true;
}

/**
 * Decide el approvalStatus inicial de un post al crearse/programarse.
 * - Si el workspace no exige aprobación → null (sin flujo).
 * - Si la exige y el creador es OWNER/ADMIN → "approved" (auto-aprobado).
 * - Si la exige y es MEMBER → "pending".
 */
export function initialApprovalStatus(
  requiresApproval: boolean,
  role: string
): "approved" | "pending" | null {
  if (!requiresApproval) return null;
  return role === "OWNER" || role === "ADMIN" ? "approved" : "pending";
}

/** Un post con aprobación pendiente no puede programarse ni publicarse. */
export function isBlockedByApproval(approvalStatus: string | null | undefined): boolean {
  return approvalStatus === "pending" || approvalStatus === "rejected";
}
