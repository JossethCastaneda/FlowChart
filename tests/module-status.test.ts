import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guard: modules with status "ready" must have at least one route under app/api/
 * that calls a host from their `apis` list to READ data (not just list resources).
 *
 * A module marked "ready" without a data-reading route misleads specialists who
 * enable it expecting functional analytics, and would cause Google OAuth
 * verification rejection (you must demonstrate usage of every requested scope).
 *
 * "List resources" routes (listing GA4 properties, GTM containers, GSC sites,
 * Ads customers) don't count — they're onboarding, not value delivery.
 *
 * Covers Z5.
 */

const ROOT = join(__dirname, "..");

// Parse the registry to find modules with status "ready"
const REGISTRY_PATH = join(ROOT, "lib", "integrations", "google", "registry.ts");
const registryContent = readFileSync(REGISTRY_PATH, "utf8");

interface ModuleInfo {
  id: string;
  apis: string[];
  status: string;
}

function parseModules(): ModuleInfo[] {
  const modules: ModuleInfo[] = [];
  const lines = registryContent.split("\n");

  let inModule = false;
  let braceDepth = 0;
  let currentBlock = "";

  for (const line of lines) {
    if (!inModule && line.includes("id:")) {
      // Check if this looks like a module entry
      const trimmed = line.trim();
      if (trimmed.match(/id:\s*"/)) {
        inModule = true;
        currentBlock = "";
        braceDepth = 0;
      }
    }

    if (inModule) {
      currentBlock += line + "\n";
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      if (braceDepth <= 0 && currentBlock.includes("status:")) {
        const idMatch = currentBlock.match(/id:\s*"([^"]+)"/);
        const statusMatch = currentBlock.match(/status:\s*"([^"]+)"/);
        const apisMatch = currentBlock.match(/apis:\s*\[([^\]]*)\]/);

        if (idMatch && statusMatch && apisMatch) {
          const apis = (apisMatch[1].match(/"([^"]+)"/g) || []).map((s) =>
            s.replace(/"/g, "")
          );
          modules.push({ id: idMatch[1], apis, status: statusMatch[1] });
        }
        inModule = false;
        currentBlock = "";
      }
    }
  }
  return modules;
}

// Routes that ONLY list/select resources (onboarding, not data delivery)
// These don't count as "reading data" for the purpose of this test.
const RESOURCE_LISTING_ROUTES = new Set([
  "app/api/integrations/google/resources/ga4",
  "app/api/integrations/google/resources/gsc",
  "app/api/integrations/google/resources/gtm",
  "app/api/integrations/google/resources/ads",
]);

function* walkRoutes(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const st = statSync(full);
      if (st.isDirectory()) {
        yield* walkRoutes(full);
      } else if (entry === "route.ts") {
        yield full;
      }
    } catch {
      continue;
    }
  }
}

// Known data-reading imports per module API
// These functions live in lib/ but are called from routes to read business data
const DATA_READING_IMPORTS: Record<string, string[]> = {
  "googleads.googleapis.com": ["getAdsCampaigns", "updateCampaignStatus"],
  "analyticsdata.googleapis.com": ["runGA4Report", "getGA4Report"],
  "tagmanager.googleapis.com": ["getTagHealth", "listTags"],
  "searchconsole.googleapis.com": ["getSearchAnalytics", "getGSCData"],
};

describe("module-status", () => {
  const modules = parseModules();
  const readyModules = modules.filter((m) => m.status === "ready");

  it("parsed at least one module from registry", () => {
    expect(modules.length).toBeGreaterThan(0);
  });

  for (const mod of readyModules) {
    it(`module "${mod.id}" (status: ready) has at least one data-reading route`, () => {
      const apiRouteDir = join(ROOT, "app", "api");
      let found = false;

      for (const routeFile of walkRoutes(apiRouteDir)) {
        const rel = relative(ROOT, routeFile).replace(/\\/g, "/");
        const routeDir = rel.replace("/route.ts", "");

        // Skip resource-listing-only routes
        if (RESOURCE_LISTING_ROUTES.has(routeDir)) continue;

        const content = readFileSync(routeFile, "utf8");

        // Check if this route calls any of the module's APIs directly
        for (const api of mod.apis) {
          const host = api.replace(/\.googleapis\.com$/, "");
          if (content.includes(host)) {
            found = true;
            break;
          }

          // Also check for imported data-reading functions
          const imports = DATA_READING_IMPORTS[api] || [];
          for (const fn of imports) {
            if (content.includes(fn)) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      expect(
        found,
        `Module "${mod.id}" is marked "ready" but no route under app/api/ ` +
          `(excluding resource-listing routes) calls any of its APIs: ${mod.apis.join(", ")}. ` +
          `Either implement the data-reading route or downgrade the status to "beta" or "stub".`
      ).toBe(true);
    });
  }
});
