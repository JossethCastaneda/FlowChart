/**
 * Google Integration — Module Registry (single source of truth)
 *
 * Commercial / multi-tenant design: each workspace connects ITS OWN Google
 * account via incremental OAuth. The platform owner registers ONE verified
 * Google Cloud OAuth app; clients never hand over keys.
 *
 * Each module is a specialist-grade capability (page analytics, tag tracking,
 * ads, bigquery). The UI requests ONLY the scopes of the modules a specialist
 * enables (incremental consent), which both reduces friction and improves the
 * odds of Google OAuth verification.
 */

export type GoogleCapability = "read" | "manage";

export type GoogleResourceType =
  | "ga4_property"
  | "gsc_site"
  | "gtm_container"
  | "ads_customer"
  | "bq_project";

export interface GoogleModule {
  id: GoogleModuleId;
  label: string;
  description: string;
  /** Google APIs this module talks to (must be enabled in the Cloud project). */
  apis: string[];
  /** OAuth scopes requested when this module is enabled. */
  scopes: string[];
  capabilities: GoogleCapability[];
  /** What the specialist selects after connecting (the account/property/site). */
  resourceTypes: GoogleResourceType[];
  /** Implementation maturity so the UI can badge "Disponible" vs "Próximamente". */
  status: "ready" | "beta" | "stub";
  docsUrl: string;
}

export type GoogleModuleId =
  | "page_analytics"
  | "tag_tracking"
  | "google_ads"
  | "bigquery";

/** Scopes always requested (identity). */
export const GOOGLE_BASE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export const GOOGLE_MODULES: GoogleModule[] = [
  {
    id: "page_analytics",
    label: "Análisis de páginas",
    description:
      "Métricas de GA4 (sesiones, páginas vistas, conversiones) por propiedad. La integración con Search Console (clics, impresiones, CTR) está en desarrollo.",
    apis: [
      "analyticsdata.googleapis.com",
      "analyticsadmin.googleapis.com",
      "searchconsole.googleapis.com",
    ],
    scopes: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
    capabilities: ["read"],
    resourceTypes: ["ga4_property", "gsc_site"],
    status: "ready",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
  },
  {
    id: "tag_tracking",
    label: "Seguimiento de etiquetas",
    description:
      "Lista contenedores de Google Tag Manager. La lectura de tags, triggers y versiones publicadas está en desarrollo.",
    apis: ["tagmanager.googleapis.com"],
    scopes: ["https://www.googleapis.com/auth/tagmanager.readonly"],
    capabilities: ["read"],
    resourceTypes: ["gtm_container"],
    status: "ready",
    docsUrl: "https://developers.google.com/tag-platform/tag-manager/api/v2",
  },
  {
    id: "google_ads",
    label: "Google Ads",
    description:
      "Campañas, métricas y gestión (crear/editar/pausar). Requiere developer token y aprobación de acceso.",
    apis: ["googleads.googleapis.com"],
    scopes: ["https://www.googleapis.com/auth/adwords"],
    capabilities: ["read", "manage"],
    resourceTypes: ["ads_customer"],
    status: "ready", // Changed from stub to ready
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
  },
  {
    id: "bigquery",
    label: "BigQuery",
    description:
      "Consultas sobre el export de GA4 y datasets del cliente para análisis avanzado.",
    apis: ["bigquery.googleapis.com"],
    scopes: ["https://www.googleapis.com/auth/bigquery.readonly"],
    capabilities: ["read"],
    resourceTypes: ["bq_project"],
    status: "stub",
    docsUrl: "https://cloud.google.com/bigquery/docs/reference/rest",
  },
];

const MODULE_MAP: Record<string, GoogleModule> = Object.fromEntries(
  GOOGLE_MODULES.map((m) => [m.id, m])
);

export function getModule(id: string): GoogleModule | null {
  return MODULE_MAP[id] || null;
}

export function modulesByIds(ids: string[]): GoogleModule[] {
  return ids.map((id) => MODULE_MAP[id]).filter(Boolean) as GoogleModule[];
}

/** Unique union of scopes for the given module ids (base scopes not included). */
export function scopesForModules(ids: string[]): string[] {
  const set = new Set<string>();
  for (const id of ids) {
    const mod = MODULE_MAP[id];
    if (mod) for (const s of mod.scopes) set.add(s);
  }
  return Array.from(set);
}

/** A module is "connected" when all of its scopes are present in grantedScopes. */
export function isModuleConnected(
  moduleId: string,
  grantedScopes: string[] | undefined | null
): boolean {
  const mod = MODULE_MAP[moduleId];
  if (!mod) return false;
  const granted = new Set(grantedScopes || []);
  return mod.scopes.every((s) => granted.has(s));
}
