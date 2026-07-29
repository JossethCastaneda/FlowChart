import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

/**
 * Guard against hardcoded Graph API versions in source code.
 *
 * Meta deprecates API versions on a rolling calendar (typically 2 years).
 * All version references should go through `env.META_API_VERSION` (defaulting
 * to v25.0 in lib/env.ts) so a single env change bumps the whole codebase.
 *
 * This test fails if any `.ts` file in `lib/` or `app/` (except `lib/env.ts`)
 * contains a URL like `graph.facebook.com/v20.0/…`.
 */

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["lib", "app"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "generated"]);

/** Matches graph.facebook.com/vNN.N inside a URL-like string */
const HARDCODED_VERSION_RE = /graph\.facebook\.com\/v\d+\.\d+/;

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
      } else if (extname(entry) === ".ts" || extname(entry) === ".tsx") {
        yield full;
      }
    } catch {
      continue;
    }
  }
}

describe("meta-api-version", () => {
  it("no Graph API version is hardcoded outside lib/env.ts", () => {
    const allowlist = new Set([
      // env.ts defines META_API_VERSION with a Zod default — the ONLY place
      // a version string should appear.
      join(ROOT, "lib", "env.ts"),
    ]);

    const findings: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        if (allowlist.has(file)) continue;

        const content = readFileSync(file, "utf8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (HARDCODED_VERSION_RE.test(lines[i])) {
            findings.push(`${relative(ROOT, file)}:${i + 1} → ${lines[i].trim().slice(0, 120)}`);
          }
        }
      }
    }

    expect(
      findings,
      `Hardcoded Graph API versions found (use env.META_API_VERSION instead):\n${findings.join("\n")}`
    ).toEqual([]);
  });
});
