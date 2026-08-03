/**
 * Pinterest Ads client — STUB.
 *
 * Auth: per-workspace OAuth via getValidAccessToken("pinterest_ads")
 * Base URL: https://api.pinterest.com/v5
 * Docs: https://developers.pinterest.com/docs/api/v5/
 *
 * TODO: Implement after creating Pinterest developer app.
 */

import { getValidAccessToken } from "./oauth";
import type { AdsClient, InsightsParams, NormalizedInsights } from "./types";

export function createPinterestAdsClient(workspaceId: string): AdsClient {
  return {
    /**
     * TODO: Fetch ad analytics from Pinterest API v5.
     * Endpoint: GET /ad_accounts/{ad_account_id}/analytics
     * Docs: https://developers.pinterest.com/docs/api/v5/#tag/ad_accounts
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async getInsights(_params: InsightsParams): Promise<NormalizedInsights> {
      const token = await getValidAccessToken(workspaceId, "pinterest_ads");
      if (!token) throw new Error("Pinterest Ads not connected for this workspace");
      throw new Error("TODO: Pinterest Ads getInsights — GET /ad_accounts/{id}/analytics");
    },

    /** TODO: POST /ad_accounts/{id}/campaigns */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async createCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Pinterest Ads createCampaign — POST /ad_accounts/{id}/campaigns");
    },

    /** TODO: PATCH /ad_accounts/{id}/campaigns */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async updateCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Pinterest Ads updateCampaign — PATCH /ad_accounts/{id}/campaigns");
    },

    /** TODO: PATCH /ad_accounts/{id}/campaigns (status: PAUSED) */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async pauseCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: Pinterest Ads pauseCampaign — PATCH status=PAUSED");
    },
  };
}
