import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// Bitácora de auditoría del módulo (spec §31, §36). Nunca debe tumbar la
// operación principal: si falla el insert, se registra y se continúa.
export async function writeAuditLog(params: {
  workspaceId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.analyticsAuditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("[audit] no se pudo escribir el log:", e instanceof Error ? e.message : e);
  }
}
