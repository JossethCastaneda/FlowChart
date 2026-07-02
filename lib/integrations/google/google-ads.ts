import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "./oauth";

const GOOGLE_ADS_API_VERSION = "v19";

export async function getAdsCampaigns(workspaceId: string, since?: string, until?: string) {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const customerId = creds.resources?.google_ads?.customerId;

  if (!customerId) {
    throw new Error("Módulo Google Ads no configurado (falta customerId)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor");
  }

  // Remove dashes from customer ID (Google Ads format: 123-456-7890 → 1234567890)
  const cleanCustomerId = customerId.replace(/-/g, "");

  // since/until vienen de query params: valida YYYY-MM-DD antes de interpolar en GAQL
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  let dateCondition = "segments.date DURING LAST_30_DAYS";
  if (since && until) {
    if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
      throw new Error("Rango de fechas inválido (formato esperado: YYYY-MM-DD)");
    }
    dateCondition = `segments.date BETWEEN '${since}' AND '${until}'`;
  }

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE ${dateCondition}
  `;

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Ads API error: ${res.status}`);
  }

  const data = await res.json();
  const campaigns: any[] = [];

  for (const batch of data) {
    for (const result of batch.results || []) {
      const c = result.campaign;
      const m = result.metrics || {};
      
      const spend = Number(m.costMicros || 0) / 1_000_000;
      const clicks = Number(m.clicks || 0);
      const impressions = Number(m.impressions || 0);
      
      campaigns.push({
        id: String(c.id),
        name: c.name,
        status: c.status,
        impressions,
        clicks,
        spend,
        conversions: Number(m.conversions || 0),
        conversionsValue: Number(m.conversionsValue || 0),
        ctr: impressions > 0 ? clicks / impressions : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
      });
    }
  }

  return { campaigns };
}

/** 
 * Mutate campaign status (ENABLED or PAUSED) on Google Ads
 */
export async function updateCampaignStatus(workspaceId: string, campaignId: string, status: "ENABLED" | "PAUSED") {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const customerId = creds.resources?.google_ads?.customerId;

  if (!customerId) {
    throw new Error("Módulo Google Ads no configurado (falta customerId)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor");
  }

  const cleanCustomerId = customerId.replace(/-/g, "");

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/campaigns:mutate`;

  const mutateOperation = {
    operations: [
      {
        update: {
          resourceName: `customers/${cleanCustomerId}/campaigns/${campaignId}`,
          status: status
        },
        updateMask: "status"
      }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mutateOperation),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Ads mutate error: ${res.status}`);
  }

  return { success: true };
}

/** 
 * Mutate campaign status to PAUSED on Google Ads (legacy wrapper)
 */
export async function pauseCampaign(workspaceId: string, campaignId: string) {
  return updateCampaignStatus(workspaceId, campaignId, "PAUSED");
}

