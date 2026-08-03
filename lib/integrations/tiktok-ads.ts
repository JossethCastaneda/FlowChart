/**
 * TikTok Ads client — STUB.
 *
 * Auth: per-workspace OAuth via getValidAccessToken("tiktok_ads")
 * Base URL: https://business-api.tiktok.com/open_api/v1.3
 * Docs: https://business-api.tiktok.com/portal/docs?id=1738373164380162
 *
 * TODO: Implement all methods after creating the TikTok developer app.
 */

import { getValidAccessToken } from "./oauth";
import type { AdsClient, InsightsParams, NormalizedInsights } from "./types";

export function createTikTokAdsClient(workspaceId: string): AdsClient {
  return {
    /**
     * TODO: Fetch ad insights from TikTok Marketing API.
     * Endpoint: GET /report/integrated/get/
     * Docs: https://business-api.tiktok.com/portal/docs?id=1738864915188737
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async getInsights(_params: InsightsParams): Promise<NormalizedInsights> {
      const token = await getValidAccessToken(workspaceId, "tiktok_ads");
      if (!token) throw new Error("TikTok Ads not connected for this workspace");
      throw new Error("TODO: TikTok Ads getInsights — GET /report/integrated/get/");
    },

    /** TODO: POST /campaign/create/ */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async createCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: TikTok Ads createCampaign — POST /campaign/create/");
    },

    /** TODO: POST /campaign/update/ */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async updateCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: TikTok Ads updateCampaign — POST /campaign/update/");
    },

    /** TODO: POST /campaign/update/status/ */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async pauseCampaign(..._args: unknown[]): Promise<unknown> {
      throw new Error("TODO: TikTok Ads pauseCampaign — POST /campaign/update/status/");
    },
  };
}
