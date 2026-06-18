import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { start } from "workflow/api";
import { syncIntegrationAssetsWorkflow } from "@/workflows/sync-integration-assets";
import { logger } from "@/lib/logger";

/**
 * Ruta invocada regularmente por un Cron (ej. cada hora) para sincronizar 
 * automáticamente los saldos, roles y bots de todas las cuentas conectadas.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const integrations = await prisma.integration.findMany({
      where: { connected: true }
    });

    let delay = 0;
    for (const integration of integrations) {
      await start(syncIntegrationAssetsWorkflow, [integration.id, delay]);
      delay += 30; // 30 seconds delay between each integration
    }

    logger.info(`Cron disparó sync para ${integrations.length} integraciones`);

    return NextResponse.json({ 
      success: true, 
      message: `Triggered sync for ${integrations.length} integrations` 
    });
  } catch (error: any) {
    logger.error("Error en el cron de sync assets", { error: error.message });
    return NextResponse.json({ error: "Error interno del cron" }, { status: 500 });
  }
}
