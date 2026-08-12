import { expect, test, describe } from "vitest";
import fs from "fs";
import path from "path";

// Patrones aprobados de resolución de scope
const APPROVED_PATTERNS = [
  /withAuth\s*\(/,
  /withWorkspace\s*\(/,
  /withWorkspaceRole\s*\(/,
  /(getToken|getServerSession)[\s\S]*?getActiveWorkspaceId/,
  /getMetaAccessToken\s*\(/,
  /getRequestWorkspaceId\s*\(/,
];

// Lista blanca explícita documentada
const WHITELIST = [
  // Rutas de autenticación básica
  "app/api/auth/[...nextauth]/route.ts",
  // Callbacks de OAuth
  "app/api/oauth/[provider]/callback/route.ts",
  "app/api/connect/callback/route.ts",
  // Webhooks reciben eventos externos
  "app/api/webhooks/meta/route.ts",
  "app/api/webhooks/resubscribe/route.ts",
  "app/api/debug/instagram-webhook/route.ts",
  "app/api/debug/webhook-status/route.ts",
  // Rutas públicas por token o slug
  "app/api/public/project/[token]/route.ts",
  "app/api/reportes/public/[slug]/route.ts",
  // Trabajos programados
  "app/api/cron/sync-ads/route.ts",
  "app/api/cron/sync-gsc/route.ts",
  "app/api/cron/sync-ga4/route.ts",
  "app/api/cron/daily/route.ts",
  "app/api/alerts/check/route.ts",
  "app/api/notifications/check-sla/route.ts",
  // Solicitudes técnicas de Meta
  "app/api/meta/data-deletion/route.ts",
  "app/api/meta/deauthorize/route.ts",
  // Facturación y Portal
  "app/api/billing/checkout/route.ts",
  "app/api/billing/portal/route.ts",
];

function getApiRoutes(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getApiRoutes(fullPath, fileList);
    } else if (file === "route.ts" || file === "route.js") {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Tenant Isolation (Z9)", () => {
  test("Cada ruta de API debe usar un patrón de aislamiento multi-tenant o estar en la lista blanca", () => {
    const apiRoutes = getApiRoutes("app/api");
    const unverifiedRoutes: string[] = [];

    for (const route of apiRoutes) {
      const normalizedRoute = route.replace(/\\/g, "/");

      const isWhitelisted = WHITELIST.some(wl => normalizedRoute === wl) ||
                            normalizedRoute.startsWith("app/api/webhooks/") ||
                            normalizedRoute.startsWith("app/api/auth/") ||
                            (normalizedRoute.startsWith("app/api/oauth/") && normalizedRoute.endsWith("/callback/route.ts")) ||
                            normalizedRoute.startsWith("app/api/cron/");

      if (isWhitelisted) continue;

      const content = fs.readFileSync(route, "utf8");
      const hasPattern = APPROVED_PATTERNS.some((pattern) => pattern.test(content));

      if (!hasPattern) {
        unverifiedRoutes.push(normalizedRoute);
      }
    }

    if (unverifiedRoutes.length > 0) {
      console.error("Rutas sin patrón de aislamiento multi-tenant:", unverifiedRoutes);
    }
    expect(unverifiedRoutes).toEqual([]);
  });
});
