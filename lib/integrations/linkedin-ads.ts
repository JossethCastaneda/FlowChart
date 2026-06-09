/**
 * LinkedIn Ads client — STUB.
 *
 * Auth: per-workspace OAuth via getValidAccessToken("linkedin_ads")
 * Base URL: https://api.linkedin.com/rest
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 *
 * TODO: Implement after creating LinkedIn Marketing Developer Platform app.
 */

import { getValidAccessToken } from "./oauth";
import type { AdsClient, InsightsParams, NormalizedInsights } from "./types";

export function createLinkedInAdsClient(workspaceId: string): AdsClient {
  return {
    /**
     * TODO: Fetch ad analytics from LinkedIn Marketing API.
     * Endpoint: GET /adAnalytics
     * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/ads-reporting
     */
    async getInsights(_params: InsightsParams): Promise<NormalizedInsights> {
      const token = await getValidAccessToken(workspaceId, "linkedin_ads");
      if (!token) throw new Error("LinkedIn Ads not connected for this workspace");
      throw new Error("TODO: LinkedIn Ads getInsights — GET /adAnalytics");
    },

    /** TODO: POST /adCampaigns */
    async createCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: LinkedIn Ads createCampaign — POST /adCampaigns");
    },

    /** TODO: POST /adCampaigns/{id} */
    async updateCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: LinkedIn Ads updateCampaign — POST /adCampaigns/{id}");
    },

    /** TODO: POST /adCampaigns/{id} (status: PAUSED) */
    async pauseCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: LinkedIn Ads pauseCampaign — PATCH /adCampaigns/{id} status=PAUSED");
    },
  };
}
