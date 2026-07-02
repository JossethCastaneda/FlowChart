import { describe, it, expect } from "vitest";
import {
  MODULE_SCOPE_MAP,
  buildScopeString,
  getRequiredScopes,
  scopeGranted,
  validateModulePermissions,
} from "../lib/meta-scopes";

// Permisos retirados de la Graph API que NUNCA deben volver al código.
const DEPRECATED = [
  "manage_pages",
  "publish_pages",
  "read_page_mailboxes",
  "publish_to_groups",
  "pages_read_posts",
  "instagram_business_content_publish", // solo válido como alias de lectura, no como scope solicitado
];

describe("meta-scopes — fuente única", () => {
  it("ningún módulo solicita permisos deprecados", () => {
    for (const [module, cfg] of Object.entries(MODULE_SCOPE_MAP)) {
      const all = [...cfg.scopes, ...cfg.permissions, ...cfg.required];
      for (const scope of all) {
        expect(DEPRECATED, `${module} solicita el permiso deprecado ${scope}`).not.toContain(scope);
      }
    }
  });

  it("required ⊆ scopes ∪ permissions en cada módulo", () => {
    for (const [module, cfg] of Object.entries(MODULE_SCOPE_MAP)) {
      const requestable = new Set([...cfg.scopes, ...cfg.permissions]);
      for (const req of cfg.required) {
        expect(requestable.has(req), `${module}: required '${req}' no se solicita`).toBe(true);
      }
    }
  });

  it("buildScopeString devuelve mínimos para módulos desconocidos", () => {
    expect(buildScopeString("desconocido")).toBe("public_profile,email");
    expect(buildScopeString("ads")).toContain("ads_management");
  });

  it("scopeGranted resuelve alias legacy en ambas direcciones", () => {
    expect(scopeGranted("instagram_content_publish", ["instagram_business_content_publish"])).toBe(true);
    expect(scopeGranted("instagram_basic", ["instagram_business_basic"])).toBe(true);
    expect(scopeGranted("ads_read", ["ads_management"])).toBe(false);
  });

  it("getRequiredScopes cae al set legacy 'meta' para módulos desconocidos", () => {
    expect(getRequiredScopes("meta")).toContain("instagram_content_publish");
    expect(getRequiredScopes("loquesea")).toEqual(getRequiredScopes("meta"));
  });

  it("validateModulePermissions no marca faltante un permiso otorgado vía alias", () => {
    const granted = [
      "pages_show_list",
      "instagram_basic",
      "instagram_business_content_publish", // nombre alterno del otorgado
      "instagram_manage_insights",
      // Nuevos permisos otorgados en julio 2026
      "instagram_manage_messages",
      "instagram_manage_comments",
      "instagram_manage_engagement",
      "instagram_manage_contents",
      "instagram_branded_content_ads_brand",
      "instagram_branded_content_brand",
      "instagram_branded_content_creator",
      "instagram_shopping_tag_products",
    ];
    const result = validateModulePermissions("publisher_instagram", granted);
    expect(result.missing).toEqual([]);
    expect(result.valid).toBe(true);
  });
});
