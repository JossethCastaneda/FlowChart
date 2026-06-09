/**
 * Normalized interfaces for multi-platform ad integrations.
 * Every platform client implements AdsClient so the dashboard
 * can consume insights from any provider with a single contract.
 */

export interface InsightsParams {
  /** Start date in YYYY-MM-DD format */
  since: string;
  /** End date in YYYY-MM-DD format */
  until: string;
  /** Platform-specific account/customer ID */
  accountId?: string;
  /** Campaign ID filter (optional) */
  campaignId?: string;
}

export interface NormalizedInsights {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  dateRange: { since: string; until: string };
  /** Platform-specific raw data (for advanced views) */
  raw?: unknown;
}

export interface AdsClient {
  /** Read campaign/ad performance insights */
  getInsights(params: InsightsParams): Promise<NormalizedInsights>;

  /**
   * Create a campaign on the platform.
   * MANAGE capability required. TODO: implement per provider.
   */
  createCampaign?(...args: unknown[]): Promise<unknown>;

  /**
   * Update a campaign on the platform.
   * MANAGE capability required. TODO: implement per provider.
   */
  updateCampaign?(...args: unknown[]): Promise<unknown>;

  /**
   * Pause a campaign on the platform.
   * MANAGE capability required. TODO: implement per provider.
   */
  pauseCampaign?(...args: unknown[]): Promise<unknown>;
}

/** Empty insights object for when no data is available */
export const EMPTY_INSIGHTS: NormalizedInsights = {
  impressions: 0,
  clicks: 0,
  spend: 0,
  conversions: 0,
  ctr: 0,
  cpc: 0,
  cpm: 0,
  roas: 0,
  dateRange: { since: "", until: "" },
};
