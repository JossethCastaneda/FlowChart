/**
 * Meta Scopes — FUENTE ÚNICA de permisos por módulo/config_id.
 *
 * Reglas:
 * - Cada módulo pide SOLO lo que necesita (least privilege).
 * - Solo nombres de permisos VIGENTES de la Graph API. Los deprecados
 *   (manage_pages, publish_pages, publish_to_groups,
 *   pages_read_posts) no deben volver a aparecer en el código.
 * - `scopes` = lo que se solicita en el diálogo OAuth (complementa al config_id).
 * - `required` = mínimo para que el módulo FUNCIONE (validación de status).
 *
 * ══ App Separation (July 2026) ══
 * - publisher_instagram → FACEBOOK_PUBLISHER_IG_CONFIG_ID
 *   Scopes: instagram_manage_messages, instagram_manage_comments,
 *           instagram_manage_engagement, instagram_manage_insights,
 *           instagram_manage_contents, instagram_content_publish
 *
 * - community → FACEBOOK_COMMUNITY_CONFIG_ID
 *   Scopes: pages_messaging + FB page scopes (no IG scopes — separate app)
 *   Added: pages_manage_engagement, pages_read_user_content, read_insights,
 *          read_page_mailboxes, publish_video
 */

export const MODULE_SCOPE_MAP: Record<string, {
  scopes: string[];
  /** Permisos adicionales opcionales que el config_id puede otorgar */
  permissions: string[];
  /** Mínimo necesario para operar — usado por connection-status */
  required: string[];
  label: string;
  riskLevel: "public" | "sensitive" | "critical";
}> = {
  publisher_facebook: {
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "publish_video",
    ],
    permissions: [
      "pages_manage_engagement",
      "pages_read_user_content",
      "pages_manage_metadata",
    ],
    required: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
    label: "Publisher Facebook",
    riskLevel: "critical",
  },
  publisher_instagram: {
    scopes: [
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
      "instagram_manage_messages",
      "instagram_manage_comments",
      "instagram_manage_engagement",
      "instagram_manage_contents",
    ],
    permissions: [
      "instagram_branded_content_ads_brand",
      "instagram_branded_content_brand",
      "instagram_branded_content_creator",
      "instagram_shopping_tag_products",
    ],
    required: [
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
    ],
    label: "Publisher Instagram",
    riskLevel: "critical",
  },
  social: {
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_read_user_content",
    ],
    permissions: [],
    required: ["pages_show_list", "pages_read_engagement"],
    label: "Social Channels (Read-only)",
    riskLevel: "sensitive",
  },
  ads: {
    scopes: ["ads_read", "ads_management"],
    permissions: ["catalog_management", "leads_retrieval"],
    required: ["ads_read", "ads_management"],
    label: "Meta Ads Manager",
    riskLevel: "critical",
  },
  analytics: {
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "instagram_basic",
      "read_insights",
    ],
    permissions: ["instagram_manage_insights"],
    required: ["read_insights", "pages_read_engagement"],
    label: "Analytics Engine",
    riskLevel: "sensitive",
  },
  community: {
    // Facebook/Inbox app — NO IG scopes (separate Instagram app for IG)
    scopes: [
      "pages_show_list",
      "pages_messaging",
      "pages_manage_metadata",
      "pages_read_user_content",
      "pages_read_engagement",
      "pages_manage_engagement",
      "read_insights",
      "publish_video",
    ],
    permissions: [
      "marketing_messages_messenger",
      "pages_messaging_phone_number",
      "pages_utility_messaging",
      "page_events",
    ],
    required: ["pages_messaging", "pages_show_list"],
    label: "Community Management",
    riskLevel: "critical",
  },
};

/**
 * Scopes mínimos del provider genérico legacy "meta" (integraciones viejas
 * conectadas antes de la separación por módulo).
 */
export const LEGACY_META_REQUIRED = [
  "pages_show_list",
  "pages_manage_posts",
  "instagram_content_publish",
];

/**
 * Equivalencias de nombres: Meta devuelve nombres distintos según el tipo de
 * login (Facebook Login for Business vs Instagram Login). Al validar permisos
 * otorgados, ambos lados de cada par se consideran equivalentes.
 */
export const SCOPE_ALIASES: Record<string, string> = {
  instagram_business_content_publish: "instagram_content_publish",
  instagram_content_publish: "instagram_business_content_publish",
  instagram_business_basic: "instagram_basic",
  instagram_basic: "instagram_business_basic",
  instagram_business_manage_messages: "instagram_manage_messages",
  instagram_manage_messages: "instagram_business_manage_messages",
};

/** ¿El scope requerido está cubierto por los otorgados (directo o vía alias)? */
export function scopeGranted(required: string, granted: string[]): boolean {
  if (granted.includes(required)) return true;
  const alias = SCOPE_ALIASES[required];
  return !!alias && granted.includes(alias);
}

/** Scopes mínimos para que un módulo funcione (para connection-status). */
export function getRequiredScopes(module: string): string[] {
  if (module === "meta") return LEGACY_META_REQUIRED;
  return MODULE_SCOPE_MAP[module]?.required ?? LEGACY_META_REQUIRED;
}

/**
 * Build scope string for Facebook OAuth dialog
 */
export function buildScopeString(module: string): string {
  const config = MODULE_SCOPE_MAP[module];
  if (!config) return "public_profile,email";

  const all = [...new Set([...config.scopes, ...config.permissions])];
  return all.join(",");
}

/**
 * Validate that granted permissions match expected for module
 */
export function validateModulePermissions(
  module: string,
  grantedScopes: string[]
): { valid: boolean; missing: string[]; extra: string[] } {
  const expected = MODULE_SCOPE_MAP[module];
  if (!expected) {
    return { valid: false, missing: [], extra: [] };
  }

  const expectedAll = new Set([...expected.scopes, ...expected.permissions]);
  const missing = Array.from(expectedAll).filter((s) => !scopeGranted(s, grantedScopes));
  const extra = grantedScopes.filter(
    (s) => !expectedAll.has(s) && !expectedAll.has(SCOPE_ALIASES[s] ?? "")
  );

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}
