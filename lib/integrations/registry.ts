/**
 * Provider Registry — OAuth integrations that use the generic
 * app/api/oauth/[provider] flow.
 *
 * Excluded (cada uno con su propio flujo establecido):
 *   - Meta      → app/api/connect/[module]
 *   - BotMaker  → lib/botmaker.ts
 *   - Google    → el Google Hub (app/api/oauth/google + lib/integrations/google).
 *                 Un único cliente OAuth (GOOGLE_CLIENT_ID) con consentimiento
 *                 incremental por módulo. Los antiguos providers google_ads/
 *                 google_analytics/google_bigquery se eliminaron de aquí en
 *                 junio 2026: estaban muertos (env.ts no exponía sus *_CLIENT_ID)
 *                 y duplicaban el Hub. NO volver a añadir Google a este registry.
 */

export interface ProviderConfig {
  id: string;
  label: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Separator between scopes — default " " (space), TikTok uses "," */
  scopeSeparator?: string;
  /** Name of the client_id param in the auth URL — default "client_id", TikTok uses "app_id" */
  clientIdParam?: string;
  /** Some providers (TikTok) use a different env var for the auth URL param vs token exchange.
   *  If set, the auth URL will use env[appIdEnv] instead of env[clientIdEnv]. */
  appIdEnv?: string;
  /** If true, skip adding response_type=code (TikTok doesn't use it) */
  skipResponseType?: boolean;
  /** Format for token exchange — "form" (default) | "json" (TikTok) */
  tokenBodyFormat?: "form" | "json";
  /** Param name for the auth code in token exchange — default "code", TikTok uses "auth_code" */
  authCodeParam?: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  capabilities: ("read" | "manage")[];
  docsUrl: string;
  /** Extra params to include in the auth URL (e.g. access_type=offline) */
  extraAuthParams?: Record<string, string>;
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  // Google vive en el Hub (app/api/oauth/google), no aquí. Ver comentario arriba.
  tiktok_ads: {
    id: "tiktok_ads",
    label: "TikTok",
    // TikTok for Developers — Content Posting API (v2)
    // This is the standard OAuth for publishing videos and reading user content.
    // The Marketing/Ads API (business-api.tiktok.com) requires separate Business Center approval.
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    // Content Posting scopes — comma-separated as required by TikTok v2
    // NOTE: video.* scopes require "Content Posting API" product to be added
    // in the TikTok Developer Portal (separate from Login Kit).
    // Start with user.info.basic to verify the OAuth flow, then expand.
    scopes: [
      "user.info.basic",
      // video.publish and video.upload re-added after confirming basic flow works
      // Requires "Content Posting API" product active in TikTok Developer Portal
    ],
    scopeSeparator: ",",
    // TikTok v2 uses "client_key" instead of "client_id" in both auth URL and token exchange
    clientIdParam: "client_key",
    clientIdEnv: "TIKTOK_ADS_CLIENT_ID",
    clientSecretEnv: "TIKTOK_ADS_CLIENT_SECRET",
    capabilities: ["read", "manage"],
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-get-started/",
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
