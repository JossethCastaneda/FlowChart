import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "./oauth";

export interface PageAnalyticsMetrics {
  pagePath: string;
  ga4: {
    views: number;
    sessions: number;
    engagementRate: number;
    conversions: number;
  } | null;
  gsc: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  } | null;
}

export async function getPageAnalytics(workspaceId: string, startDate: string, endDate: string): Promise<PageAnalyticsMetrics[]> {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "google" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const propertyId = creds.resources?.page_analytics?.ga4PropertyId;
  const siteUrl = creds.resources?.page_analytics?.gscSiteUrl;

  if (!propertyId || !siteUrl) {
    throw new Error("Módulo Análisis de Páginas no configurado (falta recurso GA4 o GSC)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const resultsMap = new Map<string, PageAnalyticsMetrics>();

  // 1. Fetch GA4 Metrics
  try {
    const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "sessions" },
          { name: "engagementRate" },
          { name: "conversions" },
        ],
        // Limitar para ejemplo, en prod podría paginar
        limit: 100, 
      }),
    });

    if (ga4Res.ok) {
      const ga4Data = await ga4Res.json();
      for (const row of (ga4Data.rows || [])) {
        const path = row.dimensionValues[0].value;
        const views = parseInt(row.metricValues[0].value, 10);
        const sessions = parseInt(row.metricValues[1].value, 10);
        const engagementRate = parseFloat(row.metricValues[2].value);
        const conversions = parseInt(row.metricValues[3].value, 10);

        resultsMap.set(path, {
          pagePath: path,
          ga4: { views, sessions, engagementRate, conversions },
          gsc: null,
        });
      }
    } else {
      console.error("[GA4 API] runReport failed", await ga4Res.json());
    }
  } catch (err) {
    console.error("[GA4 API] Exception", err);
  }

  // 2. Fetch GSC Metrics
  try {
    const gscRes = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 100,
      }),
    });

    if (gscRes.ok) {
      const gscData = await gscRes.json();
      // GSC returns full absolute URLs, we need to extract paths to match GA4
      const siteOrigin = new URL(siteUrl.startsWith("sc-domain:") ? "https://" + siteUrl.replace("sc-domain:", "") : siteUrl).origin;
      
      for (const row of (gscData.rows || [])) {
        const fullUrl = row.keys[0];
        let path = fullUrl;
        try {
          path = new URL(fullUrl).pathname;
        } catch { /* ignore */ }

        const entry = resultsMap.get(path) || { pagePath: path, ga4: null, gsc: null };
        entry.gsc = {
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        };
        resultsMap.set(path, entry);
      }
    } else {
      console.error("[GSC API] searchAnalytics failed", await gscRes.json());
    }
  } catch (err) {
    console.error("[GSC API] Exception", err);
  }

  return Array.from(resultsMap.values());
}
