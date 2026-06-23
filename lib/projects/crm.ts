// ============================================================================
// Saneamiento de la asociación CRM/bot del proyecto (escritura).
//
// Defensa multi-tenant en ESCRITURA: al crear/editar un proyecto, los ids de
// Integration que se guardan en `Project.crmIntegrationIds`/`crmIntegrationId`
// deben pertenecer al MISMO workspace del proyecto. Cualquier id ajeno o
// inexistente se descarta (no se puede asociar una integración de otro tenant).
//
// No inventa campos: solo filtra ids contra `Integration` por `workspaceId`.
// ============================================================================
import prisma from "@/lib/prisma";

/**
 * Devuelve el subconjunto (deduplicado, en orden de entrada) de `ids` que
 * corresponden a integraciones del `workspaceId` dado. Ids ajenos/inexistentes
 * se descartan.
 */
export async function sanitizeWorkspaceIntegrationIds(
  workspaceId: string,
  ids: string[]
): Promise<string[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const rows = await prisma.integration.findMany({
    where: { id: { in: unique }, workspaceId },
    select: { id: true },
  });
  const allowed = new Set(rows.map((r) => r.id));
  return unique.filter((id) => allowed.has(id));
}

/**
 * crmType que por diseño NO tienen una fila Integration asociada: el proyecto
 * elige la plataforma pero su analítica no vive en `Integration`.
 *   - "google"    → analítica en la pestaña "Análisis de Tráfico" (GA4/GTM/Ads).
 *   - "no_aplica" → el proyecto no usa ninguna plataforma de bot.
 */
const NON_INTEGRATION_CRM_TYPES = new Set(["google", "no_aplica"]);

/**
 * Resuelve el `crmType` a persistir. Se conserva si hay una integración válida
 * asociada O si es un crmType-sin-integración por diseño ("google"/"no_aplica").
 * Si es un crmType que IMPLICA integración (botmaker/cari) pero no quedó ninguna
 * válida → `null`, para no dejar una analítica fantasma apuntando a la nada.
 */
export function persistableCrmType(
  crmType: string | null | undefined,
  hasIntegration: boolean
): string | null {
  if (!crmType) return null; // "" o null → sin plataforma
  if (hasIntegration) return crmType;
  if (NON_INTEGRATION_CRM_TYPES.has(crmType)) return crmType;
  return null;
}

/**
 * Normaliza la asociación CRM de un payload de proyecto: combina
 * `crmIntegrationIds` + el legacy `crmIntegrationId`, los sanea contra el
 * workspace y devuelve el arreglo final y el legacy (primer id válido).
 */
export async function resolveProjectCrmAssociation(
  workspaceId: string,
  input: { crmIntegrationId?: string | null; crmIntegrationIds?: string[] | null }
): Promise<{ crmIntegrationIds: string[]; crmIntegrationId: string | null }> {
  const requested = [
    ...(input.crmIntegrationIds ?? []),
    ...(input.crmIntegrationId ? [input.crmIntegrationId] : []),
  ];
  const valid = await sanitizeWorkspaceIntegrationIds(workspaceId, requested);
  return { crmIntegrationIds: valid, crmIntegrationId: valid[0] ?? null };
}
