import { withAuth } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/workspace-status
 * 
 * Endpoint de diagnóstico seguro. Solo devuelve:
 * - El userId de la sesión activa
 * - Cuántos workspaces tiene ese usuario
 * - Cuál es el workspaceId activo
 * - Cuántos proyectos hay en ese workspace
 * 
 * NO devuelve datos sensibles. Solo útil para diagnosticar problemas de
 * "no veo proyectos" o "no puedo crear proyectos" en producción.
 * 
 * ELIMINAR después del diagnóstico o proteger con middleware de admin.
 */
export const GET = withAuth(async (req, ctx) => {
  const userId = ctx.userId;

  // 1. Cuántos workspaces tiene este usuario
  const membershipCount = await prisma.workspaceMember.count({
    where: { userId },
  });

  // 2. Todos los workspaces con roles
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: {
      role: true,
      workspace: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  // 3. Workspace activo según cookie
  const activeWorkspaceId = await getActiveWorkspaceId(userId);

  // 4. Proyectos en el workspace activo
  let projectCount = 0;
  if (activeWorkspaceId) {
    projectCount = await prisma.project.count({
      where: { workspaceId: activeWorkspaceId },
    });
  }

  // 5. DB host (nunca credenciales)
  const dbUrl = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || "";
  let dbHost = "unknown";
  try { dbHost = new URL(dbUrl).host; } catch { /* ignore */ }

  return apiSuccess({
    userId,
    membershipCount,
    memberships: memberships.map(m => ({
      workspaceId: m.workspace.id,
      workspaceName: m.workspace.name,
      workspaceSlug: m.workspace.slug,
      role: m.role,
    })),
    activeWorkspaceId,
    projectCount,
    dbHost,
    timestamp: new Date().toISOString(),
  });
});
