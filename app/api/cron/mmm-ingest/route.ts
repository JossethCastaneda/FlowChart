/**
 * GET /api/cron/mmm-ingest  (Vercel Cron — semanal, Lunes 07:00 UTC)
 *
 * Ingesta automática de spend semanal para el módulo MMM (Centurion).
 *
 * Flujo:
 * 1. Busca todos los workspaces con Meta Ads o Google conectados
 * 2. Para cada workspace, obtiene los clientes únicos de sus proyectos
 * 3. Para cada cliente, ejecuta ingestMmmSpend() que:
 *    a) Lee MetaAdsCache (ya sincronizado por sync-ads diario) — NO llama a Graph API
 *    b) Lee Google Ads API (si conectado)
 *    c) Upserta en MmmWeeklySpend
 *    d) Merge en CenturionModel.config.rows (preservando outcomes manuales)
 *
 * Protegido por CRON_SECRET (auth de Vercel cron).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { ingestMmmSpend } from "@/lib/mmm/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Up to 2 minutes for large workspaces

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find workspaces with ad integrations connected
    const integrations = await prisma.integration.findMany({
      where: {
        provider: { in: ["meta", "meta_ads", "google"] },
        connected: true,
      },
      select: { workspaceId: true, provider: true },
    });

    const workspaceIds = [...new Set(integrations.map((i) => i.workspaceId))];

    if (workspaceIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No workspaces with ad integrations found",
        ingested: 0,
      });
    }

    // 2. For each workspace, get unique clients from projects
    const results: Array<{
      workspaceId: string;
      clientName: string;
      weeksUpserted: number;
      errors: string[];
    }> = [];

    for (const workspaceId of workspaceIds) {
      const projects = await prisma.project.findMany({
        where: { workspaceId, client: { not: null } },
        select: { client: true },
        distinct: ["client"],
      });

      const clientNames = projects
        .map((p) => p.client)
        .filter((c): c is string => !!c && c.trim().length > 0);

      if (clientNames.length === 0) continue;

      // 3. Ingest for each client
      for (const clientName of clientNames) {
        try {
          const result = await ingestMmmSpend(workspaceId, clientName, {
            weeksCap: 16, // Last 16 weeks for cron (broader window)
            mergeIntoCenturion: true,
          });
          results.push(result);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error("[CRON/MMM-INGEST] Failed for client", {
            workspaceId,
            clientName,
            error: msg,
          });
          results.push({
            workspaceId,
            clientName,
            weeksUpserted: 0,
            errors: [msg],
          });
        }
      }
    }

    const summary = {
      ok: true,
      workspaces: workspaceIds.length,
      clients: results.length,
      totalWeeksUpserted: results.reduce((a, r) => a + r.weeksUpserted, 0),
      errors: results.filter((r) => r.errors.length > 0).length,
    };

    logger.info("[CRON/MMM-INGEST] Completed", summary);

    return NextResponse.json(summary);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[CRON/MMM-INGEST] Fatal error", { error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
