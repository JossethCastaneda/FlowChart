/**
 * Snapchat Ads client — STUB.
 *
 * Auth: per-workspace OAuth via getValidAccessToken("snapchat_ads")
 * Base URL: https://adsapi.snapchat.com/v1
 * Docs: https://developers.snap.com/api/marketing-api/overview
 *
 * TODO: Implement after creating Snapchat Business app.
 */

import { getValidAccessToken } from "./oauth";
import type { AdsClient, InsightsParams, NormalizedInsights } from "./types";

export function createSnapchatAdsClient(workspaceId: string): AdsClient {
  return {
    /**
     * TODO: Fetch ad stats from Snapchat Marketing API.
     * Endpoint: GET /adaccounts/{ad_account_id}/stats
     * Docs: https://developers.snap.com/api/marketing-api/campaigns-api/stats-api
     */
    async getInsights(_params: InsightsParams): Promise<NormalizedInsights> {
      const token = await getValidAccessToken(workspaceId, "snapchat_ads");
      if (!token) throw new Error("Snapchat Ads not connected for this workspace");
      throw new Error("TODO: Snapchat Ads getInsights — GET /adaccounts/{id}/stats");
    },

    /** TODO: POST /adaccounts/{id}/campaigns */
    async createCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Snapchat Ads createCampaign — POST /adaccounts/{id}/campaigns");
    },

    /** TODO: PUT /campaigns/{id} */
    async updateCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Snapchat Ads updateCampaign — PUT /campaigns/{id}");
    },

    /** TODO: PUT /campaigns/{id} (status: PAUSED) */
    async pauseCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Snapchat Ads pauseCampaign — PUT /campaigns/{id} status=PAUSED");
    },
  };
}
