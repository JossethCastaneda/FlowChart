// ============================================================================
// Backfill idempotente: asocia la línea CRM/bot (Integration) a los proyectos
// para que "Análisis de Resultados" resuelva proveedores (resolveProjectProviders
// lee Project.crmIntegrationIds). Causa raíz del empty state "Sin integraciones
// de analytics": el proyecto tiene canales pero su crmIntegrationIds no incluye
// la integración analítica (cari/botmaker), así que providers = [].
//
// Acciones:
//   1) Migración legacy: copia `crmIntegrationId` → `crmIntegrationIds` cuando el
//      arreglo está vacío (siempre segura e idempotente).
//   2) Asociación explícita (solo con --apply Y --project/--workspace): añade las
//      integraciones analíticas CONECTADAS del workspace del proyecto a su
//      crmIntegrationIds, sin duplicar. Multi-tenant: solo integraciones del
//      MISMO workspaceId del proyecto (nunca de otro tenant).
//
// Uso:
//   npx tsx scripts/backfill-project-crm-integrations.ts                 # dry-run (reporte)
//   npx tsx scripts/backfill-project-crm-integrations.ts --apply         # aplica solo migración legacy
//   npx tsx scripts/backfill-project-crm-integrations.ts --apply --project=<id>
//   npx tsx scripts/backfill-project-crm-integrations.ts --apply --workspace=<id>
// ============================================================================
import prisma from "../lib/prisma";
import { normalizeIntegrationProvider } from "../lib/analytics/project-scope";

const apply = process.argv.includes("--apply");
const projectArg = process.argv.find((a) => a.startsWith("--project="))?.split("=")[1];
const workspaceArg = process.argv.find((a) => a.startsWith("--workspace="))?.split("=")[1];

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

async function run() {
  console.log(`[backfill] modo: ${apply ? "APPLY" : "DRY-RUN"}${projectArg ? ` project=${projectArg}` : ""}${workspaceArg ? ` workspace=${workspaceArg}` : ""}`);

  // 1) Migración legacy crmIntegrationId → crmIntegrationIds (array vacío).
  const legacy = await prisma.project.findMany({
    where: { crmIntegrationId: { not: null }, crmIntegrationIds: { equals: [] } },
    select: { id: true, name: true, crmIntegrationId: true },
  });
  console.log(`\n[1] Migración legacy: ${legacy.length} proyecto(s) con crmIntegrationId pero crmIntegrationIds vacío.`);
  for (const p of legacy) {
    console.log(`    - ${p.name} (${p.id}) → crmIntegrationIds = ["${p.crmIntegrationId}"]`);
    if (apply) {
      await prisma.project.update({ where: { id: p.id }, data: { crmIntegrationIds: [p.crmIntegrationId as string] } });
    }
  }

  // 2) Asociación explícita de integraciones analíticas conectadas.
  const where: { id?: string; workspaceId?: string } = {};
  if (projectArg) where.id = projectArg;
  if (workspaceArg) where.workspaceId = workspaceArg;

  const projects = await prisma.project.findMany({
    where,
    select: { id: true, name: true, workspaceId: true, crmIntegrationId: true, crmIntegrationIds: true },
  });

  const canAssociate = apply && (projectArg || workspaceArg);
  console.log(`\n[2] Asociación analítica (${canAssociate ? "APPLY" : "solo reporte"}): ${projects.length} proyecto(s) en alcance.`);

  for (const p of projects) {
    const current = uniq(p.crmIntegrationIds.length ? p.crmIntegrationIds : p.crmIntegrationId ? [p.crmIntegrationId] : []);
    const linked = current.length
      ? await prisma.integration.findMany({ where: { id: { in: current }, workspaceId: p.workspaceId }, select: { id: true, provider: true } })
      : [];
    const hasAnalytics = linked.some((i) => normalizeIntegrationProvider(i.provider));
    if (hasAnalytics) continue; // ya resuelve providers; nada que hacer

    // Integraciones analíticas CONECTADAS del MISMO workspace (defensa multi-tenant).
    const wsIntegrations = await prisma.integration.findMany({
      where: { workspaceId: p.workspaceId, connected: true },
      select: { id: true, provider: true },
    });
    const candidates = wsIntegrations.filter((i) => normalizeIntegrationProvider(i.provider));

    if (candidates.length === 0) {
      console.log(`    - ${p.name} (${p.id}): sin integración analítica conectada en el workspace → no se asocia (revisar conexión Cari/Botmaker).`);
      continue;
    }
    const next = uniq([...current, ...candidates.map((c) => c.id)]);
    console.log(`    - ${p.name} (${p.id}): asociar ${candidates.map((c) => `${c.provider}(${normalizeIntegrationProvider(c.provider)})`).join(", ")} → crmIntegrationIds=${JSON.stringify(next)}`);
    if (canAssociate) {
      await prisma.project.update({ where: { id: p.id }, data: { crmIntegrationIds: next, crmIntegrationId: next[0] } });
    }
  }

  if (!apply) console.log("\n[dry-run] No se escribió nada. Re-ejecuta con --apply (+ --project/--workspace para asociar).");
  console.log("\n[backfill] Terminado.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
