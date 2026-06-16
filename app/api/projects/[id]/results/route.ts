import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { cdmxRange } from "@/lib/crm/timezone";
import { getCariCredentials, computeCariResults, EMPTY_CARI_RESULTS } from "@/lib/crm/cari";
import {
  getBotmakerConnection,
  botmakerFetch,
  listSessions,
  computeMetricsByChannel,
  computeLeadQuality,
  computeBotQuality,
  computeExecutiveDiagnostic,
  computeQualityByChannel,
  EMPTY_CHANNEL_BREAKDOWN,
  EMPTY_LEAD_QUALITY,
  EMPTY_BOT_QUALITY,
  EMPTY_DIAGNOSTIC,
  EMPTY_QUALITY_BY_CHANNEL,
} from "@/lib/botmaker";

/**
 * GET /api/projects/[id]/results?days=30
 *
 * Análisis de resultados del proyecto, segmentado por cada herramienta CRM
 * conectada (Project.crmIntegrationIds → Integration). Si el proyecto envía
 * tráfico a botmaker Y a cari, la respuesta trae un segmento independiente
 * por cada una — nunca se mezclan.
 *
 * Toda la extracción usa la misma ventana en hora CDMX (lib/crm/timezone.ts):
 * "últimos N días" significa lo mismo para todas las fuentes.
 */

interface SourceSegment {
  source: string;          // provider: "botmaker" | "cari" | ...
  label: string;
  integrationId: string;
  connected: boolean;
  error?: string;
  data: unknown;           // shape específico de cada fuente (la UI lo conoce)
}

const PROVIDER_LABELS: Record<string, string> = {
  botmaker: "Botmaker",
  cari: "Cari AI",
  custom_crm: "CRM Custom",
  hubspot: "HubSpot",
};

async function botmakerSegment(workspaceId: string, integrationId: string, days: number): Promise<SourceSegment> {
  const base: SourceSegment = { source: "botmaker", label: "Botmaker", integrationId, connected: false, data: null };
  const conn = await getBotmakerConnection(workspaceId);
  if (!conn) {
    logger.warn("project results: botmaker sin conexión (token ausente/no descifrable)", { workspaceId, integrationId });
    return { ...base, data: emptyBotmakerData() };
  }

  const range = cdmxRange(days);
  try {
    const channelPlatform = new Map<string, string>();
    let channels: { id: string; name: string; platform: string; active: boolean }[] = [];
    try {
      const chRes = await botmakerFetch("/channels", conn.accessToken, {}, 2, conn.baseUrl);
      if (chRes.ok) {
        const chData = await chRes.json();
        const items = chData.items || chData || [];
        channels = items.map((c: any) => ({ id: c.id, name: c.name, platform: c.platform, active: c.active }));
        for (const c of items) if (c?.id) channelPlatform.set(String(c.id), String(c.platform || ""));
      }
    } catch { /* canales best-effort */ }

    const sessions = await listSessions(conn.accessToken, range.fromISO, range.toISO, 6, conn.baseUrl);
    const breakdown = computeMetricsByChannel(sessions, channelPlatform);
    const leadQuality = computeLeadQuality(sessions);
    const botQuality = computeBotQuality(sessions);
    const diagnostic = computeExecutiveDiagnostic(sessions, leadQuality, botQuality);
    const qualityByChannel = computeQualityByChannel(sessions, channelPlatform).byChannel;

    return {
      ...base,
      connected: true,
      data: {
        connected: true,
        dataSource: "sessions",
        range: { from: range.fromISO, to: range.toISO, timezone: "America/Mexico_City" },
        all: breakdown.all,
        byChannel: breakdown.byChannel,
        counts: breakdown.counts,
        leadQuality, botQuality, diagnostic, qualityByChannel,
        channels,
        botErrors: [],
      },
    };
  } catch (error) {
    logger.error("project results: botmaker segment failed", { workspaceId, error });
    return { ...base, connected: true, error: "Error al consultar Botmaker", data: emptyBotmakerData() };
  }
}

function emptyBotmakerData() {
  return {
    connected: false,
    dataSource: "no_token",
    all: EMPTY_CHANNEL_BREAKDOWN.all,
    byChannel: EMPTY_CHANNEL_BREAKDOWN.byChannel,
    counts: EMPTY_CHANNEL_BREAKDOWN.counts,
    leadQuality: EMPTY_LEAD_QUALITY,
    botQuality: EMPTY_BOT_QUALITY,
    diagnostic: EMPTY_DIAGNOSTIC,
    qualityByChannel: EMPTY_QUALITY_BY_CHANNEL.byChannel,
    channels: [],
    botErrors: [],
  };
}

async function cariSegment(workspaceId: string, integrationId: string, days: number): Promise<SourceSegment> {
  const base: SourceSegment = { source: "cari", label: "Cari AI", integrationId, connected: false, data: EMPTY_CARI_RESULTS };
  try {
    const creds = await getCariCredentials(workspaceId);
    if (!creds) {
      logger.warn("project results: cari sin credenciales (token no descifrable o JSON inválido)", { workspaceId, integrationId });
      return base;
    }
    const results = await computeCariResults(creds, days);
    logger.info("project results: cari ok", {
      workspaceId,
      integrationId,
      credentialGroups: Object.keys(creds as Record<string, unknown>),
      conversations: (results as { totals?: { conversations?: number } })?.totals?.conversations ?? null,
    });
    return { ...base, connected: true, data: results };
  } catch (error) {
    logger.error("project results: cari segment failed", { workspaceId, error });
    return { ...base, connected: true, error: "Error al consultar Cari AI", data: EMPTY_CARI_RESULTS };
  }
}

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const days = Math.max(1, Math.min(180, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));

  const project = await prisma.project.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true, crmIntegrationId: true, crmIntegrationIds: true },
  });
  if (!project) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  // Multi-CRM con fallback al campo legacy de una sola integración.
  const ids = project.crmIntegrationIds.length > 0
    ? project.crmIntegrationIds
    : project.crmIntegrationId ? [project.crmIntegrationId] : [];

  const integrations = ids.length
    ? await prisma.integration.findMany({
        where: { id: { in: ids }, workspaceId: ctx.workspaceId },
        select: { id: true, provider: true, connected: true },
      })
    : [];

  const segments = await Promise.all(
    integrations.map((integ): Promise<SourceSegment> => {
      if (integ.provider === "botmaker") return botmakerSegment(ctx.workspaceId, integ.id, days);
      if (integ.provider === "cari") return cariSegment(ctx.workspaceId, integ.id, days);
      return Promise.resolve({
        source: integ.provider,
        label: PROVIDER_LABELS[integ.provider] || integ.provider,
        integrationId: integ.id,
        connected: integ.connected,
        error: "Fuente sin adaptador de resultados",
        data: null,
      });
    })
  );

  return apiSuccess({
    projectId: project.id,
    days,
    timezone: "America/Mexico_City",
    sources: segments,
  });
});

export const maxDuration = 60;
