/**
 * GET /api/mmm/spend?weeks=12&client=<nombre>
 *
 * Importa gasto semanal real desde las fuentes de datos disponibles:
 *
 * 1. **MmmWeeklySpend** (tabla pre-ingestada por cron mmm-ingest) — primera opción
 * 2. **MetaAdsCache** (sincronizado por sync-ads diario) — fallback
 * 3. **Graph API on-demand** — último recurso si no hay cache
 *
 * También integra Google Ads (si conectado) y auto-importa outcomes
 * desde las conversiones de Meta (actions → offsite_conversion.fb_pixel_purchase).
 *
 * Scope por cliente: si se pasa `client`, las cuentas publicitarias se resuelven
 * desde los proyectos de ese cliente (Channel.config.adAccounts del canal Meta).
 *
 * Response:
 * {
 *   weeks: WeeklyRow[],
 *   connected: { meta: boolean, google: boolean, tiktok: boolean }
 *   totalImported: number,
 *   accounts: number,
 *   source: "cache" | "api"
 * }
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { decryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  isoWeek,
  weekLabel,
  metaAdAccountsFromChannels,
  extractMetaSpendFromCache,
  extractGoogleSpend,
} from "@/lib/mmm/ingest";

interface MetaInsightEdge {
  date_start: string;
  spend: string;
}

export const GET = withWorkspace(async (req, ctx) => {
  const weeks = parseInt(req.nextUrl.searchParams.get("weeks") ?? "12") || 12;
  const capped = Math.min(Math.max(weeks, 1), 52);
  const client = req.nextUrl.searchParams.get("client")?.trim() || null;

  // ── Check connections ──
  const metaIntegration =
    (await prisma.integration.findFirst({
      where: { workspaceId: ctx.workspaceId, provider: "meta_ads", connected: true },
    })) ??
    (await prisma.integration.findFirst({
      where: { workspaceId: ctx.workspaceId, provider: "meta", connected: true },
    }));

  const googleIntegration = await prisma.integration.findFirst({
    where: { workspaceId: ctx.workspaceId, provider: "google", connected: true },
  });

  const connected = {
    meta: !!metaIntegration,
    google: !!googleIntegration,
    tiktok: false,
  };

  if (!metaIntegration && !googleIntegration) {
    return apiSuccess({
      weeks: [],
      connected,
      totalImported: 0,
      accounts: 0,
      source: "none",
      message: "No hay cuentas publicitarias conectadas en este workspace.",
    });
  }

  // ── Resolve ad accounts ──
  const projects = await prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId, ...(client ? { client } : {}) },
    select: { channels: { select: { config: true } } },
  });
  const accountIds = metaAdAccountsFromChannels(projects.flatMap((p) => p.channels));

  // ── Strategy 1: Read from MmmWeeklySpend (pre-ingested by cron) ──
  if (client) {
    const cachedSpend = await prisma.mmmWeeklySpend.findMany({
      where: { workspaceId: ctx.workspaceId, clientName: client },
      orderBy: { week: "asc" },
    });

    if (cachedSpend.length > 0) {
      // Group by week
      const weekMap = new Map<string, { spend: Record<string, number>; outcome: number }>();
      for (const row of cachedSpend) {
        const existing = weekMap.get(row.week) || { spend: {}, outcome: 0 };
        existing.spend[row.channel] = row.spend;
        if (row.outcome != null && row.outcome > 0) {
          existing.outcome += row.outcome;
        }
        weekMap.set(row.week, existing);
      }

      const weekRows = Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-capped)
        .map(([week, data]) => ({
          week,
          label: weekLabel(week),
          spend: data.spend,
          outcome: data.outcome,
          isOutlier: false,
          note: "",
          source: "api" as const,
        }));

      return apiSuccess({
        weeks: weekRows,
        connected,
        totalImported: weekRows.length,
        accounts: accountIds.length,
        source: "cache",
      });
    }
  }

  // ── Strategy 2: Read from MetaAdsCache (synced daily by sync-ads) ──
  if (accountIds.length > 0) {
    try {
      const metaWeeks = await extractMetaSpendFromCache(ctx.workspaceId, accountIds, capped);

      if (metaWeeks.length > 0) {
        // Also try Google
        const googleWeeks = await extractGoogleSpend(ctx.workspaceId, capped);
        const googleByWeek = new Map(googleWeeks.map((g) => [g.week, g]));

        const weekRows = metaWeeks.map((row) => {
          const googleData = googleByWeek.get(row.week);
          return {
            week: row.week,
            label: weekLabel(row.week),
            spend: {
              meta: row.spend,
              ...(googleData ? { google: googleData.spend } : {}),
            },
            outcome: row.outcome || 0,
            isOutlier: false,
            note: "",
            source: "api" as const,
          };
        });

        return apiSuccess({
          weeks: weekRows,
          connected,
          totalImported: weekRows.length,
          accounts: accountIds.length,
          source: "cache",
        });
      }
    } catch (cacheErr) {
      logger.warn("[MMM SPEND] Cache read failed, falling back to Graph API", {
        error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      });
    }
  }

  // ── Strategy 3: Fallback to Graph API on-demand (original behavior) ──
  if (!metaIntegration || accountIds.length === 0) {
    return apiError(
      client
        ? `El cliente "${client}" no tiene cuentas Meta Ads configuradas.`
        : "Ningún proyecto tiene cuentas Meta Ads configuradas.",
      "NO_AD_ACCOUNTS",
      400
    );
  }

  let accessToken = "";
  try {
    const creds = metaIntegration.credentials as Record<string, string>;
    accessToken = decryptToken(creds.accessToken ?? creds.access_token ?? "");
  } catch {
    return apiError("No se pudo leer las credenciales de Meta Ads", "CREDENTIAL_ERROR", 500);
  }
  if (!accessToken) {
    return apiError(
      "Credenciales de Meta Ads incompletas. Reconecta el módulo Ads en Integraciones.",
      "CREDENTIAL_ERROR",
      400
    );
  }

  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - capped * 7);
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = until.toISOString().slice(0, 10);
  const timeRange = encodeURIComponent(JSON.stringify({ since: sinceStr, until: untilStr }));

  const byWeek = new Map<string, number>();
  const results = await Promise.allSettled(
    accountIds.map(async (accountId) => {
      const url =
        `https://graph.facebook.com/${env.META_API_VERSION}/act_${accountId}/insights?` +
        `fields=spend&time_increment=7&time_range=${timeRange}&limit=500`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? res.statusText);
      }
      const data = (await res.json()) as { data?: MetaInsightEdge[] };
      return data.data ?? [];
    })
  );

  const failures: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      failures.push(
        `act_${accountIds[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
      );
      return;
    }
    for (const row of r.value) {
      const week = isoWeek(row.date_start);
      byWeek.set(week, (byWeek.get(week) ?? 0) + parseFloat(row.spend ?? "0"));
    }
  });

  if (failures.length === accountIds.length) {
    logger.error("[MMM SPEND] Todas las cuentas fallaron", {
      workspaceId: ctx.workspaceId,
      client,
      failures,
    });
    return apiError(`Meta Graph API error: ${failures[0]}`, "META_API_ERROR", 502);
  }
  if (failures.length > 0) {
    logger.warn("[MMM SPEND] Algunas cuentas fallaron", {
      workspaceId: ctx.workspaceId,
      client,
      failures,
    });
  }

  const weekRows = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, spend]) => ({
      week,
      label: weekLabel(week),
      spend: { meta: parseFloat(spend.toFixed(2)) },
      outcome: 0,
      isOutlier: false,
      note: "",
      source: "api" as const,
    }));

  return apiSuccess({
    weeks: weekRows,
    connected,
    totalImported: weekRows.length,
    accounts: accountIds.length,
    source: "api",
    ...(failures.length > 0 ? { partialFailures: failures.length } : {}),
  });
});
