import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guard: no hardcoded API versions in source code.
 *
 * Covers:
 *   Z7 — Meta Graph API versions (graph.facebook.com/v\d+)
 *   Z4 — Google Ads API versions (googleads.googleapis.com/v\d+)
 *
 * Exceptions:
 *   - lib/env.ts: where the default version is defined
 *   - lib/integrations/google/google-ads.ts: the single constant declaration
 *   - tests/: test files can use any version in mock URLs
 *
 * A version that enters source silently becomes a calendar-driven failure when
 * the vendor sunsets it. This test converts that risk into a build error.
 */

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["lib", "app"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "generated", "migrations"]);

// Files allowed to contain a version literal (the single source of truth)
const ALLOWED_FILES = new Set([
  "lib/env.ts",
  "lib/integrations/google/google-ads.ts",
]);

const VERSION_PATTERNS: { name: string; regex: RegExp }[] = [
  {
    name: "Hardcoded Meta Graph API version",
    regex: /graph\.facebook\.com\/v\d+(\.\d+)?/,
  },
  {
    name: "Hardcoded Google Ads API version",
    regex: /googleads\.googleapis\.com\/v\d+/,
  },
];

function* walk(dir: string): Generator<string> {
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
        if (!IGNORE_DIRS.has(entry)) yield* walk(full);
      } else if (EXTENSIONS.has(full.slice(full.lastIndexOf(".")))) {
        yield full;
      }
    } catch {
      continue;
    }
  }
}

describe("api-versions", () => {
  it("no hardcoded API versions in lib/ or app/ (except allowed files)", () => {
    const findings: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        const rel = relative(ROOT, file).replace(/\\/g, "/");
        if (ALLOWED_FILES.has(rel)) continue;

        const content = readFileSync(file, "utf8");
        for (const { name, regex } of VERSION_PATTERNS) {
          if (regex.test(content)) {
            findings.push(`${rel} → ${name}`);
          }
        }
      }
    }
    expect(
      findings,
      `Hardcoded API versions found (move to env/constant):\n${findings.join("\n")}`
    ).toEqual([]);
  });
});
