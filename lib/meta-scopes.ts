/**
 * Meta Scopes Configuration (Conforme a Meta Developers Best Practices)
 * Define scopes requeridos POR módulo/config_id
 * 
 * Cada módulo debe pedir SOLO los permisos que necesita (principle of least privilege)
 */

export const MODULE_SCOPE_MAP: Record<string, {
  scopes: string[];
  permissions: string[];
  label: string;
  riskLevel: "public" | "sensitive" | "critical";
}> = {
  publisher_facebook: {
    scopes: ["pages_show_list", "pages_manage_posts", "pages_read_posts"],
    permissions: ["publish_to_groups"],
    label: "Publisher Facebook",
    riskLevel: "critical", // Puede publicar
  },
  publisher_instagram: {
    scopes: ["instagram_business_content_publish", "instagram_basic"],
    permissions: ["pages_show_list"],
    label: "Publisher Instagram",
    riskLevel: "critical",
  },
  social: {
    scopes: ["pages_show_list", "pages_read_engagement", "pages_read_user_content"],
    permissions: [],
    label: "Social Channels (Read-only)",
    riskLevel: "sensitive",
  },
  ads: {
    scopes: ["ads_read", "ads_management"],
    permissions: ["catalog_management"],
    label: "Meta Ads Manager",
    riskLevel: "critical",
  },
  analytics: {
    scopes: ["pages_show_list", "pages_read_engagement", "instagram_basic"],
    permissions: [],
    label: "Analytics Engine",
    riskLevel: "sensitive",
  },
  community: {
    scopes: ["instagram_manage_messages", "pages_manage_metadata", "pages_read_user_content"],
    permissions: ["pages_manage_posts"],
    label: "Community Management",
    riskLevel: "critical", // Puede responder mensajes
  },
};

/**
 * Page-level scopes (enviadas con page access tokens)
 */
export const PAGE_LEVEL_PERMISSIONS = [
  "manage_pages",
  "publish_pages",
  "read_page_mailboxes",
  "manage_page_metadata",
];

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
  const grantedSet = new Set(grantedScopes);

  const missing = Array.from(expectedAll).filter(s => !grantedSet.has(s));
  const extra = grantedScopes.filter(s => !expectedAll.has(s));

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}
