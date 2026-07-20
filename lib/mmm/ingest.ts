/**
 * MMM Ingest — Lógica de agregación semanal desde caches existentes.
 *
 * Este módulo lee datos de MetaAdsCache y Google Ads API para generar
 * registros MmmWeeklySpend. Diseñado para ser llamado desde:
 *   1. El cron /api/cron/mmm-ingest (automático, semanal)
 *   2. El endpoint /api/mmm/spend (manual, on-demand)
 *
 * NO llama a la Graph API directamente — consume el cache que sync-ads
 * ya mantiene actualizado diariamente.
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getAdsCampaigns } from "@/lib/integrations/google/google-ads";

// ─── ISO Week Helpers ────────────────────────────────────────────────────────

/** Semana ISO 8601 real (maneja los bordes de año: la W01 puede caer en dic). */
export function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function weekLabel(week: string): string {
  const [year, wPart] = week.split("-W");
  return `Sem ${wPart} '${year.slice(2)}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IngestResult {
  workspaceId: string;
  clientName: string;
  channel: string;
  weeksUpserted: number;
  errors: string[];
}

interface SpendByWeek {
  week: string;
  spend: number;
  outcome?: number;
}

// ─── Meta Ads: Read from MetaAdsCache ────────────────────────────────────────

/**
 * Extract weekly spend from MetaAdsCache (already synced daily by sync-ads cron).
 * Falls back to the "last_30d" cache entry.
 */
export async function extractMetaSpendFromCache(
  workspaceId: string,
  adAccountIds: string[],
  weeksCap: number = 12
): Promise<SpendByWeek[]> {
  const byWeek = new Map<string, { spend: number; outcome: number }>();

  for (const accountId of adAccountIds) {
    // Aislamiento multi-tenant: filtrar SIEMPRE por workspaceId. Sin esto, cualquier
    // workspace podía leer el gasto cacheado de una cuenta de otro con solo poner su
    // adAccountId en la config de sus canales.
    const cacheEntries = await prisma.metaAdsCache.findMany({
      where: {
        workspaceId,
        adAccountId: { in: [`act_${accountId}`, accountId] },
        level: "campaigns",
      },
      orderBy: { updatedAt: "desc" },
      take: 1, // latest cache entry
    });

    if (cacheEntries.length === 0) continue;

    const cache = cacheEntries[0];
    const campaigns = cache.data as any[];

    if (!Array.isArray(campaigns)) continue;

    for (const campaign of campaigns) {
      const insights = campaign.insights;
      if (!insights || !insights.spend) continue;

      // insights from MetaAdsCache have date_start field
      const dateStart = insights.date_start;
      if (!dateStart) continue;

      const week = isoWeek(dateStart);
      const spend = parseFloat(insights.spend || "0");

      // Extract conversion value from actions if available
      let outcomeValue = 0;
      if (insights.action_values && Array.isArray(insights.action_values)) {
        const purchaseAction = insights.action_values.find(
          (a: any) =>
            a.action_type === "offsite_conversion.fb_pixel_purchase" ||
            a.action_type === "purchase"
        );
        if (purchaseAction) {
          outcomeValue = parseFloat(purchaseAction.value || "0");
        }
      }

      const existing = byWeek.get(week) || { spend: 0, outcome: 0 };
      byWeek.set(week, {
        spend: existing.spend + spend,
        outcome: existing.outcome + outcomeValue,
      });
    }
  }

  // Sort and cap
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-weeksCap)
    .map(([week, data]) => ({
      week,
      spend: parseFloat(data.spend.toFixed(2)),
      ...(data.outcome > 0 ? { outcome: parseFloat(data.outcome.toFixed(2)) } : {}),
    }));
}

// ─── Google Ads: Read from API ───────────────────────────────────────────────

/**
 * Extract weekly spend from Google Ads API (already implemented in google-ads.ts).
 * Returns empty array if Google is not connected.
 */
export async function extractGoogleSpend(
  workspaceId: string,
  weeksCap: number = 12
): Promise<SpendByWeek[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - weeksCap * 7);
    const sinceStr = since.toISOString().slice(0, 10);
    const untilStr = new Date().toISOString().slice(0, 10);

    const { campaigns } = await getAdsCampaigns(workspaceId, sinceStr, untilStr);

    // Google Ads returns aggregate per campaign, not per day
    // For now, distribute evenly across weeks (the API doesn't give daily breakdown by default)
    // TODO: Use daily segmented query for proper weekly aggregation
    const totalSpend = campaigns.reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
    const totalConversionsValue = campaigns.reduce(
      (sum: number, c: any) => sum + (c.conversionsValue || 0),
      0
    );

    if (totalSpend === 0) return [];

    // For now return as a single aggregate (the Google Ads query uses date segmentation
    // via DURING LAST_30_DAYS which returns aggregated data)
    const now = new Date();
    const currentWeek = isoWeek(now.toISOString().slice(0, 10));

    return [
      {
        week: currentWeek,
        spend: parseFloat(totalSpend.toFixed(2)),
        ...(totalConversionsValue > 0
          ? { outcome: parseFloat(totalConversionsValue.toFixed(2)) }
          : {}),
      },
    ];
  } catch (error) {
    // Google not connected or API error — silently return empty
    logger.warn("[MMM-INGEST] Google Ads not available", {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ─── Ad Account Resolution ───────────────────────────────────────────────────

/** Extrae los ad accounts Meta configurados en los canales de los proyectos. */
export function metaAdAccountsFromChannels(
  channels: { config: unknown }[]
): string[] {
  const ids = new Set<string>();
  for (const ch of channels) {
    const cfg = ch.config as { platformId?: string; adAccounts?: unknown } | null;
    if (!cfg || cfg.platformId !== "meta" || !Array.isArray(cfg.adAccounts)) continue;
    for (const acc of cfg.adAccounts) {
      if (typeof acc === "string" && acc.trim()) ids.add(acc.trim().replace(/^act_/, ""));
    }
  }
  return Array.from(ids);
}

// ─── Main Ingest Function ────────────────────────────────────────────────────

/**
 * Runs the full ingest pipeline for a workspace+client:
 * 1. Resolves ad accounts from project channels
 * 2. Reads MetaAdsCache for Meta spend
 * 3. Reads Google Ads API for Google spend (if connected)
 * 4. Upserts into MmmWeeklySpend
 * 5. Optionally merges into CenturionModel config rows
 *
 * @returns IngestResult with counts and errors
 */
export async function ingestMmmSpend(
  workspaceId: string,
  clientName: string,
  options: { weeksCap?: number; mergeIntoCenturion?: boolean } = {}
): Promise<IngestResult> {
  const { weeksCap = 12, mergeIntoCenturion = true } = options;
  const errors: string[] = [];
  let totalUpserted = 0;

  // 1. Resolve ad accounts for this client
  const projects = await prisma.project.findMany({
    where: { workspaceId, client: clientName },
    select: { channels: { select: { config: true } } },
  });
  const metaAccountIds = metaAdAccountsFromChannels(
    projects.flatMap((p) => p.channels)
  );

  // 2. Meta spend from cache
  if (metaAccountIds.length > 0) {
    try {
      const metaWeeks = await extractMetaSpendFromCache(workspaceId, metaAccountIds, weeksCap);
      for (const row of metaWeeks) {
        await prisma.mmmWeeklySpend.upsert({
          where: {
            workspaceId_clientName_week_channel: {
              workspaceId,
              clientName,
              week: row.week,
              channel: "meta",
            },
          },
          update: {
            spend: row.spend,
            ...(row.outcome !== undefined ? { outcome: row.outcome } : {}),
            syncedAt: new Date(),
          },
          create: {
            workspaceId,
            clientName,
            week: row.week,
            channel: "meta",
            spend: row.spend,
            outcome: row.outcome ?? null,
            source: "auto",
          },
        });
        totalUpserted++;
      }
    } catch (err) {
      const msg = `Meta cache read failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      logger.error("[MMM-INGEST] " + msg, { workspaceId, clientName });
    }
  }

  // 3. Google spend from API
  try {
    const googleWeeks = await extractGoogleSpend(workspaceId, weeksCap);
    for (const row of googleWeeks) {
      await prisma.mmmWeeklySpend.upsert({
        where: {
          workspaceId_clientName_week_channel: {
            workspaceId,
            clientName,
            week: row.week,
            channel: "google",
          },
        },
        update: {
          spend: row.spend,
          ...(row.outcome !== undefined ? { outcome: row.outcome } : {}),
          syncedAt: new Date(),
        },
        create: {
          workspaceId,
          clientName,
          week: row.week,
          channel: "google",
          spend: row.spend,
          outcome: row.outcome ?? null,
          source: "auto",
        },
      });
      totalUpserted++;
    }
  } catch (err) {
    // Google errors are non-fatal — we still have Meta data
    const msg = `Google Ads failed: ${err instanceof Error ? err.message : String(err)}`;
    errors.push(msg);
  }

  // 4. Merge into CenturionModel config rows if requested
  if (mergeIntoCenturion && totalUpserted > 0) {
    try {
      await mergeSpendIntoCenturion(workspaceId, clientName);
    } catch (err) {
      errors.push(`Centurion merge failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Update lastIngestAt on CenturionModel
  if (totalUpserted > 0) {
    await prisma.centurionModel.updateMany({
      where: { workspaceId, clientName },
      data: { lastIngestAt: new Date() },
    });
  }

  return {
    workspaceId,
    clientName,
    channel: "all",
    weeksUpserted: totalUpserted,
    errors,
  };
}

// ─── Merge Into Centurion ────────────────────────────────────────────────────

/**
 * Reads the latest MmmWeeklySpend rows and merges them into the CenturionModel
 * config.rows, preserving any manually-entered outcomes and outlier flags.
 */
async function mergeSpendIntoCenturion(
  workspaceId: string,
  clientName: string
): Promise<void> {
  const model = await prisma.centurionModel.findFirst({
    where: { workspaceId, clientName },
    orderBy: { updatedAt: "desc" },
  });

  if (!model) return; // No model created yet — will be merged on next manual save

  const config = model.config as { channels?: any[]; rows?: any[]; [key: string]: any };
  const existingRows = Array.isArray(config.rows) ? config.rows : [];

  // Build a map of existing rows by week for quick lookup
  const existingMap = new Map(existingRows.map((r: any) => [r.week, r]));

  // Get all weekly spend data for this client
  const spendRows = await prisma.mmmWeeklySpend.findMany({
    where: { workspaceId, clientName },
    orderBy: { week: "asc" },
  });

  // Group by week
  const weekSpend = new Map<string, Record<string, number>>();
  const weekOutcome = new Map<string, number>();

  for (const row of spendRows) {
    const existing = weekSpend.get(row.week) || {};
    existing[row.channel] = row.spend;
    weekSpend.set(row.week, existing);

    if (row.outcome != null && row.outcome > 0) {
      weekOutcome.set(row.week, (weekOutcome.get(row.week) || 0) + row.outcome);
    }
  }

  // Merge: update existing rows with new spend data, add new rows
  const mergedRows: any[] = [];
  const allWeeks = new Set([...existingMap.keys(), ...weekSpend.keys()]);

  for (const week of Array.from(allWeeks).sort()) {
    const existing = existingMap.get(week);
    const newSpend = weekSpend.get(week);
    const autoOutcome = weekOutcome.get(week);

    if (existing) {
      // Merge spend into existing row (don't overwrite manually-set outcomes)
      const mergedSpendObj = { ...(existing.spend || {}), ...(newSpend || {}) };
      mergedRows.push({
        ...existing,
        spend: mergedSpendObj,
        // Only set outcome from auto-import if user hasn't set one manually
        ...(existing.outcome === 0 && autoOutcome ? { outcome: autoOutcome } : {}),
        source: "api",
      });
    } else if (newSpend) {
      // New row from auto-ingest
      mergedRows.push({
        week,
        label: weekLabel(week),
        spend: newSpend,
        outcome: autoOutcome || 0,
        isOutlier: false,
        note: "",
        source: "api",
      });
    }
  }

  // Update the CenturionModel config
  await prisma.centurionModel.update({
    where: { id: model.id },
    data: {
      config: { ...config, rows: mergedRows },
      lastIngestAt: new Date(),
    },
  });
}
