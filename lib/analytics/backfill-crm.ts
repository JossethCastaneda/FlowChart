// ============================================================================
// Lógica idempotente de backfill de la línea CRM/bot del proyecto (causa raíz
// del empty state "Sin integraciones de analytics"; ver reporte §17).
//
// Compartida por:
//   - scripts/backfill-project-crm-integrations.ts (CLI)
//   - app/api/admin/backfill-project-crm-integrations/route.ts (ruta admin temporal)
//
// NO expone credenciales: solo opera sobre ids de Integration y arreglos
// `crmIntegrationIds`. Defensa multi-tenant: las integraciones siempre se
// resuelven por el `workspaceId` del propio proyecto (nunca de otro tenant).
// ============================================================================

import prisma from "@/lib/prisma";
import { normalizeIntegrationProvider, deriveNormalizedProviders } from "./project-scope";

export type BackfillAction = "legacy_migrate" | "associate" | "already_ok" | "skip_no_candidates";

export interface BackfillChange {
  projectId: string;
  name: string;
  action: BackfillAction;
  before: string[];
  after: string[];
  /** Proveedores normalizados que resultan (p. ej. ["cari_ai"]). */
  providers: string[];
  note?: string;
}

export interface BackfillSummary {
  apply: boolean;
  scope: { projectId?: string; workspaceId?: string };
  legacyMigrated: number;
  associated: number;
  changes: BackfillChange[];
}

export interface BackfillOptions {
  /** Acotar a un proyecto concreto. */
  projectId?: string;
  /** Acotar al workspace (defensa tenant: solo proyectos de este workspace). */
  workspaceId?: string;
  /** Escribir cambios; por defecto false (dry-run). */
  apply?: boolean;
  /** Ejecutar la asociación de integraciones (paso 2). Por defecto, sí cuando
   *  hay un proyecto/workspace acotado; en barrido global sin scope, solo reporta. */
  associate?: boolean;
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

/**
 * Ejecuta el backfill idempotente. Devuelve un resumen estructurado (sin
 * secretos). Con `apply: false` (default) no escribe nada: solo planifica.
 */
export async function backfillProjectCrmIntegrations(opts: BackfillOptions = {}): Promise<BackfillSummary> {
  const apply = opts.apply === true;
  const associate = opts.associate ?? Boolean(opts.projectId || opts.workspaceId);

  const baseWhere: { id?: string; workspaceId?: string } = {};
  if (opts.projectId) baseWhere.id = opts.projectId;
  if (opts.workspaceId) baseWhere.workspaceId = opts.workspaceId;

  const changes: BackfillChange[] = [];
  let legacyMigrated = 0;
  let associated = 0;

  // ── Paso 1: migración legacy crmIntegrationId → crmIntegrationIds vacío ──
  const legacy = await prisma.project.findMany({
    where: { ...baseWhere, crmIntegrationId: { not: null }, crmIntegrationIds: { equals: [] } },
    select: { id: true, name: true, crmIntegrationId: true },
  });
  for (const p of legacy) {
    const after = [p.crmIntegrationId as string];
    changes.push({ projectId: p.id, name: p.name, action: "legacy_migrate", before: [], after, providers: [] });
    legacyMigrated++;
    if (apply) {
      await prisma.project.update({ where: { id: p.id }, data: { crmIntegrationIds: after } });
    }
  }

  // ── Paso 2: asociación de integraciones analíticas conectadas ──
  if (associate) {
    const projects = await prisma.project.findMany({
      where: baseWhere,
      select: { id: true, name: true, workspaceId: true, crmIntegrationId: true, crmIntegrationIds: true },
    });

    for (const p of projects) {
      const current = uniq(p.crmIntegrationIds.length ? p.crmIntegrationIds : p.crmIntegrationId ? [p.crmIntegrationId] : []);

      // ¿Ya resuelve algún proveedor analítico con lo que tiene?
      const linked = current.length
        ? await prisma.integration.findMany({ where: { id: { in: current }, workspaceId: p.workspaceId }, select: { provider: true } })
        : [];
      const currentProviders = deriveNormalizedProviders(linked.map((i) => i.provider));
      if (currentProviders.length > 0) {
        changes.push({ projectId: p.id, name: p.name, action: "already_ok", before: current, after: current, providers: currentProviders });
        continue;
      }

      // Candidatas: integraciones analíticas CONECTADAS del MISMO workspace.
      const wsIntegrations = await prisma.integration.findMany({
        where: { workspaceId: p.workspaceId, connected: true },
        select: { id: true, provider: true },
      });
      const candidates = wsIntegrations.filter((i) => normalizeIntegrationProvider(i.provider));
      if (candidates.length === 0) {
        changes.push({
          projectId: p.id, name: p.name, action: "skip_no_candidates", before: current, after: current, providers: [],
          note: "Sin integración analítica conectada (Cari/Botmaker) en el workspace.",
        });
        continue;
      }

      const after = uniq([...current, ...candidates.map((c) => c.id)]);
      const providers = deriveNormalizedProviders(candidates.map((c) => c.provider));
      changes.push({ projectId: p.id, name: p.name, action: "associate", before: current, after, providers });
      associated++;
      if (apply) {
        await prisma.project.update({ where: { id: p.id }, data: { crmIntegrationIds: after, crmIntegrationId: after[0] } });
      }
    }
  }

  return {
    apply,
    scope: { projectId: opts.projectId, workspaceId: opts.workspaceId },
    legacyMigrated,
    associated,
    changes,
  };
}
