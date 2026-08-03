import prisma from "@/lib/prisma";
import { refreshAccessToken, GoogleCredentials } from "./oauth";
import { googleFetch } from "@/lib/google-fetch";

export const GOOGLE_ADS_API_VERSION = "v25";

export async function getAdsCampaigns(workspaceId: string, since?: string, until?: string) {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  const customerIds = creds.resources?.google_ads?.customerIds || 
                      (creds.resources?.google_ads?.customerId ? [creds.resources.google_ads.customerId] : []);

  if (!customerIds || customerIds.length === 0) {
    throw new Error("Módulo Google Ads no configurado (falta customerIds)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor");
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const campaigns: any[] = [];

  await Promise.all(
    customerIds.map(async (cid) => {
      const cleanCustomerId = cid.replace(/-/g, "");
      const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`;

      try {
        const res = await googleFetch(url, accessToken, {
          method: "POST",
          headers: {
            "developer-token": developerToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) return;

        const data = await res.json();
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
              accountId: cid // Add accountId to identify the campaign's account
            });
          }
        }
      } catch (e) {
        console.error(`Error fetching campaigns for Google Ads account ${cid}:`, e);
      }
    })
  );

  return { campaigns };
}

export async function getAdsInsights(workspaceId: string, accountIds: string[], since?: string, until?: string) {
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration || !integration.connected) {
    throw new Error("Google not connected");
  }

  const creds = integration.credentials as unknown as GoogleCredentials;
  let customerIds = creds.resources?.google_ads?.customerIds || 
                      (creds.resources?.google_ads?.customerId ? [creds.resources.google_ads.customerId] : []);

  if (!customerIds || customerIds.length === 0) {
    throw new Error("Módulo Google Ads no configurado (falta customerIds)");
  }

  // Filter if specific accounts requested
  if (accountIds && accountIds.length > 0 && !accountIds.includes("all")) {
    customerIds = customerIds.filter(id => accountIds.includes(id));
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor");
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  let dateCondition = "segments.date DURING LAST_30_DAYS";
  if (since && until) {
    if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
      throw new Error("Rango de fechas inválido (formato esperado: YYYY-MM-DD)");
    }
    dateCondition = `segments.date BETWEEN '${since}' AND '${until}'`;
  }

  // Query 1: Time Series (By Date)
  const tsQuery = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM customer
    WHERE ${dateCondition}
  `;

  // Query 2: Campaigns
  const campQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE ${dateCondition}
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos
  const timeSeries: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos
  const campaigns: any[] = [];

  await Promise.all(
    customerIds.map(async (cid) => {
      const cleanCustomerId = cid.replace(/-/g, "");
      const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`;

      // Fetch TimeSeries
      try {
        const res = await googleFetch(url, accessToken, {
          method: "POST", headers: { "developer-token": developerToken, "Content-Type": "application/json" },
          body: JSON.stringify({ query: tsQuery }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const batch of data) {
            for (const result of batch.results || []) {
              const d = result.segments?.date;
              const m = result.metrics || {};
              const spend = Number(m.costMicros || 0) / 1_000_000;
              const conversions = Number(m.conversions || 0);
              
              if (d) {
                // Check if date exists to aggregate
                const existing = timeSeries.find(t => t.date_start === d);
                if (existing) {
                  existing.spend += spend;
                  existing.impressions += Number(m.impressions || 0);
                  existing.clicks += Number(m.clicks || 0);
                  const act = existing.actions.find((a: any) => a.action_type === "purchase");
                  if (act) act.value = (Number(act.value) + conversions).toString();
                } else {
                  timeSeries.push({
                    date_start: d,
                    date_stop: d,
                    spend,
                    impressions: Number(m.impressions || 0),
                    clicks: Number(m.clicks || 0),
                    actions: [{ action_type: "purchase", value: conversions.toString() }]
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching timeSeries for Google Ads account ${cid}:`, e);
      }

      // Fetch Campaigns
      try {
        const res = await googleFetch(url, accessToken, {
          method: "POST", headers: { "developer-token": developerToken, "Content-Type": "application/json" },
          body: JSON.stringify({ query: campQuery }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const batch of data) {
            for (const result of batch.results || []) {
              const c = result.campaign;
              const m = result.metrics || {};
              const spend = Number(m.costMicros || 0) / 1_000_000;
              const conversions = Number(m.conversions || 0);
              
              campaigns.push({
                campaign_id: String(c.id),
                campaign_name: c.name,
                status: c.status,
                spend,
                impressions: Number(m.impressions || 0),
                clicks: Number(m.clicks || 0),
                actions: [{ action_type: "purchase", value: conversions.toString() }],
                account_id: cid
              });
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching campaigns for Google Ads account ${cid}:`, e);
      }
    })
  );

  return { timeSeries, campaigns, adsets: [], ads: [] };
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
  const customerIds = creds.resources?.google_ads?.customerIds || 
                      (creds.resources?.google_ads?.customerId ? [creds.resources.google_ads.customerId] : []);

  if (!customerIds || customerIds.length === 0) {
    throw new Error("Módulo Google Ads no configurado (falta customerIds)");
  }

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("No se pudo obtener token de acceso");
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor");
  }

  // We don't know which customerId owns the campaignId from the request, 
  // so we try mutating them all sequentially until one succeeds, 
  // or we could require the frontend to pass the customerId. 
  // Since Zefirus currently only passes campaignId, we try all mapped accounts.
  
  let lastError = null;
  let success = false;

  for (const cid of customerIds) {
    const cleanCustomerId = cid.replace(/-/g, "");
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

    const res = await googleFetch(url, accessToken, {
      method: "POST",
      headers: {
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mutateOperation),
    });

    if (res.ok) {
      success = true;
      break;
    } else {
      lastError = await res.json().catch(() => ({}));
    }
  }

  if (!success) {
    throw new Error(lastError?.error?.message || `Google Ads mutate error`);
  }

  return { success: true };
}

/** 
 * Mutate campaign status to PAUSED on Google Ads (legacy wrapper)
 */
export async function pauseCampaign(workspaceId: string, campaignId: string) {
  return updateCampaignStatus(workspaceId, campaignId, "PAUSED");
}

