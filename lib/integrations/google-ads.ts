/**
 * Google Ads client — REFERENCE IMPLEMENTATION.
 *
 * Uses Google Ads API v19 (REST) with OAuth from the workspace Integration.
 * getInsights is fully wired; create/update/pause are typed stubs.
 *
 * Requires env: GOOGLE_ADS_DEVELOPER_TOKEN (from the MCC API Center)
 * Auth: per-workspace OAuth token via getValidAccessToken("google_ads")
 */

import { getValidAccessToken } from "./oauth";
import type { AdsClient, InsightsParams, NormalizedInsights } from "./types";
export { EMPTY_INSIGHTS } from "./types";

const GOOGLE_ADS_API_VERSION = "v19";

export function createGoogleAdsClient(workspaceId: string): AdsClient {
  return {
    /**
     * Fetch account-level insights using Google Ads Query Language (GAQL).
     * Endpoint: POST /customers/{customerId}/googleAds:searchStream
     * Docs: https://developers.google.com/google-ads/api/docs/reporting/overview
     */
    async getInsights(params: InsightsParams): Promise<NormalizedInsights> {
      const token = await getValidAccessToken(workspaceId, "google_ads");
      if (!token) throw new Error("Google Ads not connected for this workspace");

      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
      if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN not configured");

      if (!params.accountId) throw new Error("accountId (Google Ads customer ID) is required");

      // Remove dashes from customer ID (Google Ads format: 123-456-7890 → 1234567890)
      const customerId = params.accountId.replace(/-/g, "");

      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.average_cpm,
          metrics.conversions_value
        FROM customer
        WHERE segments.date BETWEEN '${params.since}' AND '${params.until}'
      `;

      const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "developer-token": developerToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const error = await res.text().catch(() => "unknown");
        throw new Error(`Google Ads API error: ${res.status} — ${error}`);
      }

      const data = await res.json();

      // Parse the streaming response (array of batches)
      let impressions = 0;
      let clicks = 0;
      let costMicros = 0;
      let conversions = 0;
      let conversionsValue = 0;

      for (const batch of data) {
        for (const result of batch.results || []) {
          const m = result.metrics;
          impressions += Number(m.impressions || 0);
          clicks += Number(m.clicks || 0);
          costMicros += Number(m.costMicros || 0);
          conversions += Number(m.conversions || 0);
          conversionsValue += Number(m.conversionsValue || 0);
        }
      }

      const spend = costMicros / 1_000_000;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const roas = spend > 0 ? conversionsValue / spend : 0;

      return {
        impressions,
        clicks,
        spend,
        conversions,
        ctr,
        cpc,
        cpm,
        roas,
        dateRange: { since: params.since, until: params.until },
        raw: data,
      };
    },

    /**
     * TODO: Create a campaign on Google Ads.
     * Endpoint: POST /customers/{customerId}/campaigns:mutate
     * Docs: https://developers.google.com/google-ads/api/docs/campaigns/overview
     *
     * RBAC: Only OWNER/ADMIN. Requires double confirmation before spending.
     * TODO: Add audit log entry before mutation.
     */
    async createCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Google Ads createCampaign — POST /customers/{id}/campaigns:mutate");
    },

    /**
     * TODO: Update a campaign on Google Ads.
     * Endpoint: POST /customers/{customerId}/campaigns:mutate (with updateMask)
     * Docs: https://developers.google.com/google-ads/api/docs/campaigns/overview
     *
     * TODO: Add audit log entry before mutation.
     */
    async updateCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Google Ads updateCampaign — POST /customers/{id}/campaigns:mutate");
    },

    /**
     * TODO: Pause a campaign on Google Ads.
     * Endpoint: POST /customers/{customerId}/campaigns:mutate (status = PAUSED)
     * Docs: https://developers.google.com/google-ads/api/reference/rpc/v19/Campaign
     *
     * TODO: Add audit log entry before mutation.
     */
    async pauseCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Google Ads pauseCampaign — set status=PAUSED via campaigns:mutate");
    },
  };
}
