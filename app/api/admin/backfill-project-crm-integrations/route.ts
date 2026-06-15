// ============================================================================
// RUTA ADMIN TEMPORAL — backfill de la línea CRM/bot del proyecto.
//
// Propósito: ejecutar en producción la lógica idempotente de
// `scripts/backfill-project-crm-integrations.ts` sin guardar secrets locales.
//
// Autenticación (cualquiera de las dos):
//   1) CRON_SECRET  → header `Authorization: Bearer <CRON_SECRET>` (fail-closed).
//   2) OWNER        → sesión cuyo rol en el workspace activo es OWNER.
//
// Seguridad:
//   - dryRun por defecto (`apply` debe enviarse explícitamente en true).
//   - Defensa multi-tenant: el proyecto debe pertenecer al workspace resuelto;
//     las integraciones se resuelven por ese workspaceId (nunca de otro tenant).
//   - No expone secrets: la respuesta solo trae ids/proveedores/contadores.
//   - Logs seguros: solo projectId + acción + contadores.
//
// CÓMO ELIMINAR (es temporal): borra esta carpeta
//   app/api/admin/backfill-project-crm-integrations/
// El módulo reutilizable `lib/analytics/backfill-crm.ts` y el script CLI quedan
// (no dependen de esta ruta).
//
// Uso:
//   POST /api/admin/backfill-project-crm-integrations
//   body: { "projectId": "<id>", "apply": false }   // dry-run
//   body: { "projectId": "<id>", "apply": true }    // aplica
// ============================================================================
import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";
import { safeGetSession } from "@/lib/api-handler";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { backfillProjectCrmIntegrations } from "@/lib/analytics/backfill-crm";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  projectId: z.string().min(1),
  apply: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = await validateBody(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  const { projectId, apply } = parsed.data;

  // ── Resolución de autorización + workspace objetivo ──
  let workspaceId: string;

  if (verifyCronAuth(req)) {
    // Vía CRON_SECRET: el workspace objetivo es el del propio proyecto.
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
    if (!project) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
    workspaceId = project.workspaceId;
  } else {
    // Vía sesión: requiere OWNER del workspace activo, y el proyecto debe ser suyo.
    const session = await safeGetSession();
    const userId = session?.user?.id;
    if (!userId) return apiUnauthorized();

    const activeWorkspaceId = await getActiveWorkspaceId(userId);
    if (!activeWorkspaceId) return apiError("Sin workspace activo", "NO_WORKSPACE", 400);

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: activeWorkspaceId, userId } },
      select: { role: true },
    });
    if (member?.role !== "OWNER") return apiForbidden("Solo el OWNER del workspace puede ejecutar el backfill");

    // El proyecto debe pertenecer al workspace del OWNER (defensa tenant + 404).
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: activeWorkspaceId },
      select: { id: true },
    });
    if (!project) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
    workspaceId = activeWorkspaceId;
  }

  // ── Ejecutar lógica idempotente acotada a projectId + workspaceId ──
  const summary = await backfillProjectCrmIntegrations({ projectId, workspaceId, apply, associate: true });

  // Log seguro (sin secrets): solo identificadores y contadores.
  console.log(
    `[admin/backfill-crm] project=${projectId} ws=${workspaceId} apply=${apply} ` +
      `legacyMigrated=${summary.legacyMigrated} associated=${summary.associated} changes=${summary.changes.length}`
  );

  return apiSuccess(summary);
}
