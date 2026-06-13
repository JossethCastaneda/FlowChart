import prisma from "@/lib/prisma";
import {
  ProjectScope,
  deriveProjectChannels,
  deriveNormalizedProviders,
} from "./project-scope";

export type { ProjectScope };

/**
 * Resuelve el alcance analítico de un proyecto verificando ANTES la propiedad
 * multi-tenant: el proyecto debe pertenecer al `workspaceId` del contexto
 * autenticado. Devuelve `null` si el proyecto no existe o no es del workspace
 * (la ruta debe responder 404 en ese caso, nunca exponer datos de otro tenant).
 *
 * El `workspaceId` NUNCA proviene del query: se pasa desde la sesión.
 */
export async function resolveProjectScope(
  workspaceId: string,
  projectId: string
): Promise<ProjectScope | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: {
      id: true,
      whatsapp: true,
      instagram: true,
      fanpage: true,
      crmIntegrationId: true,
      crmIntegrationIds: true,
    },
  });
  if (!project) return null;

  const ids =
    project.crmIntegrationIds.length > 0
      ? project.crmIntegrationIds
      : project.crmIntegrationId
        ? [project.crmIntegrationId]
        : [];

  // Las integraciones también se acotan por workspace: defensa adicional contra
  // ids inyectados que pertenezcan a otro tenant.
  const integrations = ids.length
    ? await prisma.integration.findMany({
        where: { id: { in: ids }, workspaceId },
        select: { provider: true },
      })
    : [];

  return {
    projectId: project.id,
    providers: deriveNormalizedProviders(integrations.map((i) => i.provider)),
    channels: deriveProjectChannels(project),
  };
}

export interface ProjectScopeView extends ProjectScope {
  name: string;
  alias: string | null;
}

/**
 * Variante para la vista (página): además del alcance, devuelve nombre/alias
 * del proyecto para encabezados. `null` si no existe o no es del workspace.
 */
export async function resolveProjectScopeView(
  workspaceId: string,
  projectId: string
): Promise<ProjectScopeView | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: {
      id: true,
      name: true,
      alias: true,
      whatsapp: true,
      instagram: true,
      fanpage: true,
      crmIntegrationId: true,
      crmIntegrationIds: true,
    },
  });
  if (!project) return null;

  const ids =
    project.crmIntegrationIds.length > 0
      ? project.crmIntegrationIds
      : project.crmIntegrationId
        ? [project.crmIntegrationId]
        : [];

  const integrations = ids.length
    ? await prisma.integration.findMany({
        where: { id: { in: ids }, workspaceId },
        select: { provider: true },
      })
    : [];

  return {
    projectId: project.id,
    name: project.name,
    alias: project.alias,
    providers: deriveNormalizedProviders(integrations.map((i) => i.provider)),
    channels: deriveProjectChannels(project),
  };
}

export type ScopeResolution =
  | { ok: true; scope: ProjectScope | null }
  | { ok: false };

/**
 * Resuelve el alcance opcional de proyecto desde el query (`projectId`). Para
 * usar en las rutas globales de analítica:
 *   - sin `projectId` → `{ ok:true, scope:null }` (comportamiento global intacto).
 *   - con `projectId` válido y del workspace → `{ ok:true, scope }`.
 *   - con `projectId` inexistente/ajeno → `{ ok:false }` (responder 404).
 */
export async function scopeFromRequest(
  sp: URLSearchParams,
  workspaceId: string
): Promise<ScopeResolution> {
  const projectId = sp.get("projectId");
  if (!projectId) return { ok: true, scope: null };
  const scope = await resolveProjectScope(workspaceId, projectId);
  if (!scope) return { ok: false };
  return { ok: true, scope };
}
