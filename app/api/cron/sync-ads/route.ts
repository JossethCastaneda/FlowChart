import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { verifyCronAuth } from "@/lib/cron-auth";
import { syncIntegrationAssetsWorkflow } from "@/workflows/sync-integration-assets";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/sync-ads  (Vercel Cron)
 *
 * Pre-cachea MetaAdsCache (campañas/adsets/ads con insights last_30d) de cada
 * workspace con Meta conectado, despachando el workflow de deep-sync que ya
 * mantiene esa caché. Se ejecuta en background vía Vercel Workflow, de modo que
 * el dashboard de Ads lea de caché fresca en vez de pegarle a Graph en vivo.
 *
 * Se dispara UN workflow por workspace (no por integración) para no duplicar el
 * trabajo: todos los módulos meta_* del workspace comparten las mismas cuentas
 * publicitarias. Se prefiere la integración genérica "meta"; si no existe, se
 * usa "meta_ads".
 */
export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Integraciones Meta conectadas que pueden listar cuentas publicitarias.
    const integrations = await prisma.integration.findMany({
      where: { provider: { in: ["meta", "meta_ads"] }, connected: true },
      select: { id: true, workspaceId: true, provider: true },
    });

    // Una integración por workspace, prefiriendo "meta" sobre "meta_ads".
    const byWorkspace = new Map<string, { id: string; provider: string }>();
    for (const intg of integrations) {
      const current = byWorkspace.get(intg.workspaceId);
      if (!current || (current.provider !== "meta" && intg.provider === "meta")) {
        byWorkspace.set(intg.workspaceId, { id: intg.id, provider: intg.provider });
      }
    }

    let dispatched = 0;
    let delay = 0;
    const failures: string[] = [];
    for (const [workspaceId, intg] of byWorkspace) {
      try {
        await start(syncIntegrationAssetsWorkflow, [intg.id, delay]);
        dispatched++;
        delay += 30; // 30 seconds stagger to prevent Rate Limit spikes
      } catch (err) {
        failures.push(workspaceId);
        logger.error("sync-ads: failed to dispatch workflow", {
          route: "api/cron/sync-ads",
          workspaceId,
          integrationId: intg.id,
          error: err,
        });
      }
    }

    logger.info("sync-ads cron complete", {
      route: "api/cron/sync-ads",
      workspaces: byWorkspace.size,
      dispatched,
      failed: failures.length,
    });

    return NextResponse.json({
      success: true,
      workspaces: byWorkspace.size,
      dispatched,
      failed: failures.length,
    });
  } catch (err) {
    logger.error("sync-ads cron error", { route: "api/cron/sync-ads", error: err });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
