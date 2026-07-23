/**
 * GET /api/cron/sync-insights
 *
 * Daily cron job (0 4 * * * UTC) that syncs ad insights from all
 * connected providers into a normalized InsightsCache.
 *
 * Protected by CRON_SECRET (Vercel cron auth).
 * Does NOT run during render — purely async background sync.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import prisma from "@/lib/prisma";
import { PROVIDERS } from "@/lib/integrations/registry";
import { logger } from "@/lib/logger";

// NOTA: Google NO se sincroniza aquí. Vive en el Google Hub (provider "google"):
// sus insights se sirven on-demand vía app/api/integrations/google/resources/*.
// Este cron es el skeleton para los ad-networks del registry genérico
// (tiktok, linkedin, pinterest, snapchat, x) cuando implementen AdsClient.
// import { createTikTokAdsClient } from "@/lib/integrations/tiktok-ads";

/** Map provider → client factory. Only providers with implemented getInsights. */
const CLIENT_FACTORIES: Record<string, (workspaceId: string) => { getInsights: (params: { since: string; until: string; accountId?: string }) => Promise<unknown> }> = {
  // TODO: registrar clientes a medida que se implementen (tiktok_ads, etc.)
};

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerIds = Object.keys(PROVIDERS);

  // Find all connected integrations for supported providers
  const integrations = await prisma.integration.findMany({
    where: {
      connected: true,
      provider: { in: providerIds },
    },
    select: {
      workspaceId: true,
      provider: true,
    },
  });

  const results: Array<{ workspaceId: string; provider: string; status: string; error?: string }> = [];

  // Date range: yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const since = yesterday.toISOString().slice(0, 10);
  const until = since;

  for (const integ of integrations) {
    const factory = CLIENT_FACTORIES[integ.provider];
    if (!factory) {
      // Provider doesn't have an implemented client yet — skip
      results.push({ workspaceId: integ.workspaceId, provider: integ.provider, status: "skipped", error: "client not implemented" });
      continue;
    }

    try {
      const client = factory(integ.workspaceId);
      const insights = await client.getInsights({ since, until });

      // Upsert into InsightsCache
      // TODO: Uncomment when InsightsCache model is added via db push
      // await prisma.insightsCache.upsert({
      //   where: { workspaceId_provider_userId: { workspaceId: integ.workspaceId, provider: integ.provider, userId: "workspace" } },
      //   create: { workspaceId: integ.workspaceId, provider: integ.provider, data: insights as any, fetchedAt: new Date() },
      //   update: { data: insights as any, fetchedAt: new Date() },
      // });

      // For now, just log success
      logger.info(`[SYNC]  ${integ.provider} for workspace ${integ.workspaceId}`, JSON.stringify(insights).slice(0, 200));
      results.push({ workspaceId: integ.workspaceId, provider: integ.provider, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      logger.error(`[SYNC]  ${integ.provider} for workspace ${integ.workspaceId}:`, message);
      results.push({ workspaceId: integ.workspaceId, provider: integ.provider, status: "error", error: message });
    }
  }

  return NextResponse.json({
    synced: results.filter(r => r.status === "ok").length,
    skipped: results.filter(r => r.status === "skipped").length,
    errors: results.filter(r => r.status === "error").length,
    details: results,
  });
}
