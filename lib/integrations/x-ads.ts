/**
 * X (Twitter) Ads client — STUB.
 *
 * Auth: per-workspace OAuth 2.0 via getValidAccessToken("x_ads")
 * Base URL: https://ads-api.x.com/12 (v12)
 * Docs: https://developer.x.com/en/docs/twitter-ads-api
 *
 * TODO: Implement after creating X developer app with Ads API access.
 * NOTE: X Ads API requires an approved developer account.
 */

import { getValidAccessToken } from "./oauth";
import type { AdsClient, InsightsParams, NormalizedInsights } from "./types";

export function createXAdsClient(workspaceId: string): AdsClient {
  return {
    /**
     * TODO: Fetch ad stats from X Ads API.
     * Endpoint: GET /stats/accounts/{account_id}
     * Docs: https://developer.x.com/en/docs/twitter-ads-api/analytics/api-reference/asynchronous
     */
    async getInsights(_params: InsightsParams): Promise<NormalizedInsights> {
      const token = await getValidAccessToken(workspaceId, "x_ads");
      if (!token) throw new Error("X Ads not connected for this workspace");
      throw new Error("TODO: X Ads getInsights — GET /stats/accounts/{account_id}");
    },

    /** TODO: POST /accounts/{account_id}/campaigns */
    async createCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: X Ads createCampaign — POST /accounts/{id}/campaigns");
    },

    /** TODO: PUT /accounts/{account_id}/campaigns/{campaign_id} */
    async updateCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: X Ads updateCampaign — PUT /accounts/{id}/campaigns/{id}");
    },

    /** TODO: PUT /accounts/{account_id}/campaigns/{campaign_id} (entity_status: PAUSED) */
    async pauseCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: X Ads pauseCampaign — PUT entity_status=PAUSED");
    },
  };
}
