/**
 * GET /api/mmm/spend?weeks=12&client=<nombre>
 *
 * Importa gasto semanal real desde las integraciones conectadas al workspace:
 * - Meta Ads (Graph API): agrega spend por semana ISO
 * - Google Ads, TikTok: stubs (no implementados aun, devuelven connected: false)
 *
 * Scope por cliente: si se pasa `client`, las cuentas publicitarias se resuelven
 * desde los proyectos de ese cliente (Channel.config.adAccounts del canal Meta).
 * Sin `client`, se agregan las cuentas de todos los proyectos del workspace.
 *
 * Response:
 * {
 *   weeks: WeeklyRow[],
 *   connected: { meta: boolean, google: boolean, tiktok: boolean }
 *   totalImported: number,
 *   accounts: number
 * }
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { decryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface MetaInsightEdge {
  date_start: string;
  spend: string;
}

/** Semana ISO 8601 real (maneja los bordes de año: la W01 puede caer en dic). */
function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  // Jueves de la misma semana determina el año ISO
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function weekLabel(week: string): string {
  const [year, wPart] = week.split("-W");
  return `Sem ${wPart} '${year.slice(2)}`;
}

/** Extrae los ad accounts Meta configurados en los canales de los proyectos. */
function metaAdAccountsFromChannels(
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

export const GET = withWorkspace(async (req, ctx) => {
  const weeks = parseInt(req.nextUrl.searchParams.get("weeks") ?? "12") || 12;
  const capped = Math.min(Math.max(weeks, 1), 52);
  const client = req.nextUrl.searchParams.get("client")?.trim() || null;

  // ── Token Meta: integración del módulo Ads (fallback al genérico "meta") ──
  const metaIntegration =
    (await prisma.integration.findFirst({
      where: { workspaceId: ctx.workspaceId, provider: "meta_ads", connected: true },
    })) ??
    (await prisma.integration.findFirst({
      where: { workspaceId: ctx.workspaceId, provider: "meta", connected: true },
    }));

  const connected = {
    meta: !!metaIntegration,
    google: false,
    tiktok: false,
  };

  if (!metaIntegration) {
    return apiSuccess({
      weeks: [],
      connected,
      totalImported: 0,
      accounts: 0,
      message: "No hay cuentas Meta Ads conectadas en este workspace.",
    });
  }

  let accessToken = "";
  try {
    const creds = metaIntegration.credentials as Record<string, string>;
    accessToken = decryptToken(creds.accessToken ?? creds.access_token ?? "");
  } catch {
    return apiError("No se pudo leer las credenciales de Meta Ads", "CREDENTIAL_ERROR", 500);
  }
  if (!accessToken) {
    return apiError("Credenciales de Meta Ads incompletas. Reconecta el módulo Ads en Integraciones.", "CREDENTIAL_ERROR", 400);
  }

  // ── Ad accounts del cliente (o del workspace completo si no hay client) ──
  const projects = await prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId, ...(client ? { client } : {}) },
    select: { channels: { select: { config: true } } },
  });
  const accountIds = metaAdAccountsFromChannels(projects.flatMap((p) => p.channels));

  if (accountIds.length === 0) {
    return apiError(
      client
        ? `El cliente "${client}" no tiene cuentas Meta Ads configuradas. Edita su proyecto y agrega las cuentas publicitarias en el canal Meta.`
        : "Ningún proyecto tiene cuentas Meta Ads configuradas en sus canales.",
      "NO_AD_ACCOUNTS",
      400
    );
  }

  // ── Rango de fechas ──
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - capped * 7);
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = until.toISOString().slice(0, 10);
  const timeRange = encodeURIComponent(JSON.stringify({ since: sinceStr, until: untilStr }));

  // ── Insights por cuenta (paralelo), agregado por semana ISO ──
  const byWeek = new Map<string, number>();
  const results = await Promise.allSettled(
    accountIds.map(async (accountId) => {
      const url =
        `https://graph.facebook.com/v21.0/act_${accountId}/insights?` +
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
      failures.push(`act_${accountIds[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
      return;
    }
    for (const row of r.value) {
      const week = isoWeek(row.date_start);
      byWeek.set(week, (byWeek.get(week) ?? 0) + parseFloat(row.spend ?? "0"));
    }
  });

  if (failures.length === accountIds.length) {
    logger.error("[MMM SPEND] Todas las cuentas fallaron", { workspaceId: ctx.workspaceId, client, failures });
    return apiError(`Meta Graph API error: ${failures[0]}`, "META_API_ERROR", 502);
  }
  if (failures.length > 0) {
    logger.warn("[MMM SPEND] Algunas cuentas fallaron", { workspaceId: ctx.workspaceId, client, failures });
  }

  const weekRows = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, spend]) => ({
      week,
      label: weekLabel(week),
      spend: { meta: parseFloat(spend.toFixed(2)) },
      outcome: 0, // el usuario llena el KPI (ventas/leads)
      isOutlier: false,
      note: "",
      source: "api" as const,
    }));

  return apiSuccess({
    weeks: weekRows,
    connected,
    totalImported: weekRows.length,
    accounts: accountIds.length,
    ...(failures.length > 0 ? { partialFailures: failures.length } : {}),
  });
});
