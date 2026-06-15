import prisma from "@/lib/prisma";
import { getCariCredentials } from "@/lib/crm/cari";
import { getBotmakerConnection } from "@/lib/botmaker";
import { CariAiAnalyticsAdapter } from "@/lib/analytics/adapters/CariAiAnalyticsAdapter";
import { BotmakerAnalyticsAdapter } from "@/lib/analytics/adapters/BotmakerAnalyticsAdapter";
import { writeAuditLog } from "@/lib/analytics/audit";

export async function runScheduledSync() {
  const syncJobs = [];
  
  // 1. Encontramos todas las integraciones activas para sync.
  const integrations = await prisma.integration.findMany({
    where: { connected: true, provider: { in: ["cari", "botmaker"] } }
  });

  for (const integ of integrations) {
    try {
      // Calculamos la ventana de tiempo. Por defecto últimas 24h.
      // En un flujo más avanzado, usaríamos cursores de la última sync exitosa.
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 1);

      let success = false;
      let inserted = 0;
      let failed = 0;
      let error = "";

      if (integ.provider === "cari") {
        const adapter = new CariAiAnalyticsAdapter();
        const res = await adapter.syncConversations(integ.workspaceId, startDate, endDate);
        success = res.success;
        inserted = res.recordsInserted;
        failed = res.recordsFailed;
        error = res.error || "";
      } else if (integ.provider === "botmaker") {
        const adapter = new BotmakerAnalyticsAdapter();
        const res = await adapter.syncConversations(integ.workspaceId, startDate, endDate);
        success = res.success;
        inserted = res.recordsInserted;
        failed = res.recordsFailed;
        error = res.error || "";
      }

      // Generar alerta de fallo de sync si es necesario
      if (!success) {
        await prisma.analyticsAlert.create({
          data: {
            workspaceId: integ.workspaceId,
            type: "sync_failed",
            severity: "critical",
            title: `Error en sincronización con ${integ.provider}`,
            message: `El proceso programado falló: ${error}`
          }
        });
      }

      // Guardar log
      await writeAuditLog({
        workspaceId: integ.workspaceId,
        action: "cron_sync",
        resourceType: "integration",
        resourceId: integ.id,
        metadata: { provider: integ.provider, success, inserted, failed, error }
      });

      syncJobs.push({ provider: integ.provider, workspaceId: integ.workspaceId, success, inserted, failed });

    } catch (e: any) {
      console.error("Error running cron for integration", integ.id, e);
    }
  }

  return syncJobs;
}
