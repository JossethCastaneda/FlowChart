/**
 * lib/audit.ts — Registro de auditoría de acciones sensibles del workspace.
 *
 * Trazabilidad para equipos/enterprise: quién hizo qué y cuándo (cambios de rol,
 * remoción de miembros, cambios de permisos, desconexión de integraciones…).
 * NUNCA guardar tokens/secretos en `details`.
 *
 * Best-effort: un fallo al auditar nunca bloquea la acción principal.
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface AuditParams {
  workspaceId: string;
  userId?: string | null;
  /** Verbo de la acción, p. ej. "member.role_changed", "integration.disconnected". */
  action: string;
  /** Tipo del recurso afectado, p. ej. "WorkspaceMember", "Integration". */
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
}

export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        details: params.details ? (params.details as object) : undefined,
      },
    });
  } catch (err) {
    logger.warn("[AUDIT] no se pudo registrar", {
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
