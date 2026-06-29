/**
 * GET /api/mmm/spend?weeks=12
 *
 * Importa gasto semanal real desde las integraciones conectadas al workspace:
 * - Meta Ads (Graph API): agrega spend por semana ISO
 * - Google Ads, TikTok: stubs (no implementados aun, devuelven connected: false)
 *
 * Response:
 * {
 *   weeks: WeeklyRow[],
 *   connected: { meta: boolean, google: boolean, tiktok: boolean }
 *   totalImported: number
 * }
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

interface MetaInsightEdge {
  date_start: string;
  spend: string;
}

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  // Simple ISO week: YYYY-WNN
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function weekLabel(isoWeek: string): string {
  const [year, wPart] = isoWeek.split("-W");
  return `Sem ${wPart} '${year.slice(2)}`;
}

export const GET = withWorkspace(async (req, ctx) => {
  const weeks = parseInt(req.nextUrl.searchParams.get("weeks") ?? "12") || 12;
  const capped = Math.min(weeks, 52);

  // ── Meta Ads ──────────────────────────────────────────────────────────────
  // Buscar integration de tipo meta_ads conectada
  const metaIntegration = await prisma.integration.findFirst({
    where: {
      workspaceId: ctx.workspaceId,
      provider: "meta_ads",
      connected: true,
    },
  });

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
      message: "No hay cuentas Meta Ads conectadas en este workspace.",
    });
  }

  // Descifrar token
  let accessToken: string;
  let adAccountId: string;
  try {
    const { decryptToken } = await import("@/lib/encryption");
    const creds = metaIntegration.credentials as Record<string, string>;
    accessToken = decryptToken(creds.access_token ?? creds.accessToken ?? "");
    adAccountId = creds.adAccountId ?? creds.ad_account_id ?? "";
  } catch {
    return apiError("No se pudo leer las credenciales de Meta Ads", "CREDENTIAL_ERROR", 500);
  }

  if (!accessToken || !adAccountId) {
    return apiError("Credenciales de Meta Ads incompletas", "CREDENTIAL_ERROR", 400);
  }

  // Calcular rango de fechas
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - capped * 7);
  const sinceStr = since.toISOString().slice(0, 10);
  const untilStr = until.toISOString().slice(0, 10);

  const accountId = adAccountId.replace(/^act_/, "");
  const url = `https://graph.facebook.com/v21.0/act_${accountId}/insights?` +
    `fields=spend&time_increment=7&time_range=${encodeURIComponent(JSON.stringify({ since: sinceStr, until: untilStr }))}` +
    `&access_token=${accessToken}`;

  let insights: MetaInsightEdge[] = [];
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return apiError(`Meta Graph API error: ${(err as any)?.error?.message ?? res.statusText}`, "META_API_ERROR", 502);
    }
    const data = await res.json() as { data: MetaInsightEdge[] };
    insights = data.data ?? [];
  } catch (e) {
    return apiError("Error conectando con Meta Ads", "FETCH_ERROR", 502);
  }

  // Agrupar por semana ISO
  const byWeek = new Map<string, number>();
  for (const row of insights) {
    const week = isoWeek(row.date_start);
    byWeek.set(week, (byWeek.get(week) ?? 0) + parseFloat(row.spend ?? "0"));
  }

  // Construir WeeklyRows (spend solo tiene canal "meta" por ahora)
  const weekRows = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, spend]) => ({
      week,
      label: weekLabel(week),
      spend: { meta: parseFloat(spend.toFixed(2)) },
      outcome: 0,       // el usuario llena el KPI (ventas/leads)
      isOutlier: false,
      note: "",
      source: "api" as const,
    }));

  return apiSuccess({
    weeks: weekRows,
    connected,
    totalImported: weekRows.length,
  });
});
