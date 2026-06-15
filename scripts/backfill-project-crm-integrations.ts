// ============================================================================
// CLI del backfill idempotente de la línea CRM/bot del proyecto (causa raíz del
// empty state "Sin integraciones de analytics"; ver reporte §17). La lógica vive
// en lib/analytics/backfill-crm.ts (compartida con la ruta admin temporal).
//
// Uso:
//   npx tsx scripts/backfill-project-crm-integrations.ts                 # dry-run (reporte global)
//   npx tsx scripts/backfill-project-crm-integrations.ts --apply         # aplica solo migración legacy
//   npx tsx scripts/backfill-project-crm-integrations.ts --apply --project=<id>
//   npx tsx scripts/backfill-project-crm-integrations.ts --apply --workspace=<id>
// ============================================================================
import prisma from "../lib/prisma";
import { backfillProjectCrmIntegrations } from "../lib/analytics/backfill-crm";

const apply = process.argv.includes("--apply");
const projectId = process.argv.find((a) => a.startsWith("--project="))?.split("=")[1];
const workspaceId = process.argv.find((a) => a.startsWith("--workspace="))?.split("=")[1];

async function run() {
  console.log(`[backfill] modo: ${apply ? "APPLY" : "DRY-RUN"}${projectId ? ` project=${projectId}` : ""}${workspaceId ? ` workspace=${workspaceId}` : ""}`);

  const summary = await backfillProjectCrmIntegrations({
    projectId,
    workspaceId,
    apply,
    // La asociación (paso 2) solo se ejecuta con un alcance concreto.
    associate: Boolean(projectId || workspaceId),
  });

  console.log(`\n[1] Migración legacy: ${summary.legacyMigrated} proyecto(s).`);
  console.log(`[2] Asociación analítica: ${summary.associated} proyecto(s).`);
  for (const c of summary.changes) {
    const provs = c.providers.length ? ` providers=${JSON.stringify(c.providers)}` : "";
    const note = c.note ? ` (${c.note})` : "";
    console.log(`    - [${c.action}] ${c.name} (${c.projectId}) ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}${provs}${note}`);
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
