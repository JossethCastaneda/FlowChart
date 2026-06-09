/**
 * Provider Registry — single source of truth for all OAuth integrations.
 *
 * Meta and BotMaker are excluded here; they use their own established flows
 * (app/api/connect/[module] and lib/botmaker.ts respectively).
 */

export interface ProviderConfig {
  id: string;
  label: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  capabilities: ("read" | "manage")[];
  docsUrl: string;
  /** Extra params to include in the auth URL (e.g. access_type=offline) */
  extraAuthParams?: Record<string, string>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  google_ads: {
    id: "google_ads",
    label: "Google Ads",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    clientIdEnv: "GOOGLE_ADS_CLIENT_ID",
    clientSecretEnv: "GOOGLE_ADS_CLIENT_SECRET",
    capabilities: ["read", "manage"],
    docsUrl: "https://developers.google.com/google-ads/api/docs/get-started/introduction",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },

  google_analytics: {
    id: "google_analytics",
    label: "Google Analytics 4",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    clientIdEnv: "GOOGLE_ANALYTICS_CLIENT_ID",
    clientSecretEnv: "GOOGLE_ANALYTICS_CLIENT_SECRET",
    capabilities: ["read"],
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },

  google_bigquery: {
    id: "google_bigquery",
    label: "Google BigQuery",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/bigquery.readonly"],
    clientIdEnv: "GOOGLE_BIGQUERY_CLIENT_ID",
    clientSecretEnv: "GOOGLE_BIGQUERY_CLIENT_SECRET",
    capabilities: ["read"],
    docsUrl: "https://cloud.google.com/bigquery/docs/reference/rest",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },

  tiktok_ads: {
    id: "tiktok_ads",
    label: "TikTok Ads",
    authUrl: "https://business-api.tiktok.com/portal/auth",
    tokenUrl: "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
    scopes: [],
    clientIdEnv: "TIKTOK_ADS_CLIENT_ID",
    clientSecretEnv: "TIKTOK_ADS_CLIENT_SECRET",
    capabilities: ["read", "manage"],
    docsUrl: "https://business-api.tiktok.com/portal/docs?id=1738373164380162",
  },

  linkedin_ads: {
    id: "linkedin_ads",
    label: "LinkedIn Ads",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_ads_reporting", "r_ads", "r_organization_social"],
    clientIdEnv: "LINKEDIN_ADS_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_ADS_CLIENT_SECRET",
    capabilities: ["read"],
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
  },

  pinterest_ads: {
    id: "pinterest_ads",
    label: "Pinterest Ads",
    authUrl: "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scopes: ["ads:read", "user_accounts:read"],
    clientIdEnv: "PINTEREST_ADS_CLIENT_ID",
    clientSecretEnv: "PINTEREST_ADS_CLIENT_SECRET",
    capabilities: ["read"],
    docsUrl: "https://developers.pinterest.com/docs/api/v5/",
  },

  snapchat_ads: {
    id: "snapchat_ads",
    label: "Snapchat Ads",
    authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    scopes: ["snapchat-marketing-api"],
    clientIdEnv: "SNAPCHAT_ADS_CLIENT_ID",
    clientSecretEnv: "SNAPCHAT_ADS_CLIENT_SECRET",
    capabilities: ["read"],
    docsUrl: "https://developers.snap.com/api/marketing-api/overview",
  },

  x_ads: {
    id: "x_ads",
    label: "X (Twitter) Ads",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    scopes: ["ads.read", "tweet.read", "users.read", "offline.access"],
    clientIdEnv: "X_ADS_CLIENT_ID",
    clientSecretEnv: "X_ADS_CLIENT_SECRET",
    capabilities: ["read"],
    docsUrl: "https://developer.x.com/en/docs/twitter-ads-api",
    extraAuthParams: { code_challenge_method: "S256" },
  },
};

/** Get a provider config by id, or null if not in the registry. */
export function getProvider(id: string): ProviderConfig | null {
  return PROVIDERS[id] ?? null;
}

/** All provider IDs in the registry */
export function getProviderIds(): string[] {
  return Object.keys(PROVIDERS);
}
