/**
 * Google Analytics 4 (Data API) client.
 *
 * Auth: per-workspace OAuth via getValidAccessToken("google_analytics")
 * Endpoint: POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 *
 * TODO: Implement full report builder. Currently a wired skeleton with example query.
 */

import { getValidAccessToken } from "./oauth";
import prisma from "@/lib/prisma";
import { refreshAccessToken, type GoogleCredentials } from "./google/oauth";

export interface GA4ReportParams {
  propertyId: string;
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
}

/**
 * Run a GA4 Data API report.
 * TODO: Fully implement and normalize response.
 */
export async function runGA4Report(
  workspaceId: string,
  params: GA4ReportParams
): Promise<unknown> {
  const token = await getValidAccessToken(workspaceId, "google_analytics");
  if (!token) throw new Error("Google Analytics not connected for this workspace");

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${params.propertyId}:runReport`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: params.dateRanges,
      dimensions: params.dimensions || [],
      metrics: params.metrics,
    }),
  });

  if (!res.ok) {
    const error = await res.text().catch(() => "unknown");
    throw new Error(`GA4 Data API error: ${res.status} — ${error}`);
  }

  return res.json();
}

/**
 * Example: Get sessions + pageviews for the last 7 days.
 * TODO: Replace with configurable report builder.
 */
export async function getGA4SessionsSummary(
  workspaceId: string,
  propertyId: string
): Promise<unknown> {
  return runGA4Report(workspaceId, {
    propertyId,
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "activeUsers" },
      { name: "averageSessionDuration" },
    ],
    dimensions: [{ name: "date" }],
  });
}

// ============================================================================
// Resumen de tráfico de landing para la pestaña "Análisis de Tráfico" del
// proyecto (Plataforma Analítica = Google). Usa la integración canónica
// `provider: "google"` (la misma que guarda la propiedad GA4 en sus creds) y
// `refreshAccessToken`, NO el provider genérico "google_analytics" del skeleton.
// Degrada con gracia: si Google/GA4 no está conectado o la propiedad no está
// seleccionada, devuelve { connected:false } (la UI muestra "Conecta GA4").
// ============================================================================

/** Totales de tráfico ya normalizados para las tarjetas de TrafficAnalytics. */
export interface TrafficSummary {
  users: number;
  sessions: number;
  engagement: number; // engagementRate en % (0-100)
  avg_duration: number; // averageSessionDuration en segundos
  conversions: number; // keyEvents (conversiones GA4)
  bounce: number; // bounceRate en % (0-100)
}

export interface ProjectTrafficResult {
  connected: boolean;
  propertyId: string | null;
  metrics: TrafficSummary | null;
}

/** Resuelve el access token + propiedad GA4 desde la integración "google". */
async function resolveGa4Property(
  workspaceId: string,
  overridePropertyId?: string
): Promise<{ token: string; propertyId: string } | null> {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });
  if (!integration?.connected) return null;

  const creds = integration.credentials as unknown as GoogleCredentials | null;
  // Use project-level property if available, otherwise fall back to workspace-level
  const propertyId: string | undefined = overridePropertyId || creds?.resources?.page_analytics?.ga4PropertyId;
  if (!propertyId) return null;

  const token = await refreshAccessToken(workspaceId);
  if (!token) return null;

  return { token, propertyId };
}

/**
 * Trae el resumen de tráfico del sitio (últimos `days` días) vía GA4 Data API
 * para el workspace o proyecto. Nunca lanza: ante cualquier problema → connected:false.
 * @param projectGa4PropertyId - Optional GA4 property ID from the project's googleSources.
 *   If provided, overrides the workspace-level GA4 property.
 */
export async function getProjectTrafficSummary(
  workspaceId: string,
  days = 28,
  projectGa4PropertyId?: string
): Promise<ProjectTrafficResult> {
  const resolved = await resolveGa4Property(workspaceId, projectGa4PropertyId);
  if (!resolved) return { connected: false, propertyId: null, metrics: null };

  const { token, propertyId } = resolved;
  // La propiedad puede venir como "properties/123456" o "123456".
  const numericId = propertyId.replace(/^properties\//, "");
  const range = Math.max(1, Math.min(Number.isFinite(days) ? days : 28, 365));

  // Métricas estándar GA4 Data API v1beta. `keyEvents` reemplazó a `conversions`.
  const metricNames = ["activeUsers", "sessions", "engagementRate", "averageSessionDuration", "keyEvents", "bounceRate"];

  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${numericId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: `${range}daysAgo`, endDate: "today" }],
          metrics: metricNames.map((name) => ({ name })),
        }),
      }
    );
    if (!res.ok) {
      console.error("[GA4] runReport (traffic) failed:", res.status, await res.text().catch(() => ""));
      return { connected: false, propertyId, metrics: null };
    }
    const json = (await res.json()) as { rows?: { metricValues?: { value?: string }[] }[] };
    const vals = json.rows?.[0]?.metricValues?.map((m) => Number(m.value ?? 0) || 0) ?? [];
    const at = (i: number) => vals[i] ?? 0;

    const metrics: TrafficSummary = {
      users: Math.round(at(0)),
      sessions: Math.round(at(1)),
      engagement: Math.round(at(2) * 1000) / 10, // ratio (0-1) → %
      avg_duration: Math.round(at(3)), // segundos
      conversions: Math.round(at(4)),
      bounce: Math.round(at(5) * 1000) / 10, // ratio (0-1) → %
    };
    return { connected: true, propertyId, metrics };
  } catch (err) {
    console.error("[GA4] traffic summary exception:", err);
    return { connected: false, propertyId, metrics: null };
  }
}
