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
