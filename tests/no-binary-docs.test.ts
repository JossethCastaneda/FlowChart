import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

/**
 * Guard against binary corruption and encoding drift in documentation and
 * source files. Catches:
 *   - NUL bytes (0x00): sign of a corrupted merge or binary-mode write
 *   - Mojibake patterns: UTF-8 → Latin-1 → UTF-8 double-encoding artifacts
 *
 * Modelled on tests/no-secrets.test.ts.
 */

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["app", "lib", "components", "scripts", "hooks", "stores", "prisma", "docs"];
const EXTENSIONS = new Set([".md", ".ts", ".tsx"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "generated", "migrations"]);

/** Common mojibake patterns from UTF-8 → Latin-1 → UTF-8 round-trip */
const MOJIBAKE_RE = /Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±|â€/;

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
      } else if (EXTENSIONS.has(extname(entry))) {
        yield full;
      }
    } catch {
      continue;
    }
  }
}

// Also scan root-level .md files (CLAUDE.md, AGENTS.md, README.md, etc.)
function* rootMdFiles(): Generator<string> {
  try {
    for (const entry of readdirSync(ROOT)) {
      if (extname(entry) === ".md") {
        const full = join(ROOT, entry);
        try {
          if (statSync(full).isFile()) yield full;
        } catch {
          continue;
        }
      }
    }
  } catch {
    return;
  }
}

describe("no-binary-docs", () => {
  it("no file contains NUL bytes (0x00)", () => {
    const findings: string[] = [];
    const allFiles = function* () {
      yield* rootMdFiles();
      for (const dir of SCAN_DIRS) {
        yield* walk(join(ROOT, dir));
      }
    };

    for (const file of allFiles()) {
      const buf = readFileSync(file);
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x00) {
          findings.push(`${relative(ROOT, file)} → NUL byte at offset ${i}`);
          break; // one finding per file is enough
        }
      }
    }

    expect(findings, `Files with NUL bytes:\n${findings.join("\n")}`).toEqual([]);
  });

  it("no file contains mojibake (double-encoded UTF-8)", () => {
    const findings: string[] = [];
    const allFiles = function* () {
      yield* rootMdFiles();
      for (const dir of SCAN_DIRS) {
        yield* walk(join(ROOT, dir));
      }
    };

    for (const file of allFiles()) {
      const content = readFileSync(file, "utf8");
      if (MOJIBAKE_RE.test(content)) {
        const match = content.match(MOJIBAKE_RE);
        findings.push(
          `${relative(ROOT, file)} → mojibake "${match?.[0]}" found`
        );
      }
    }

    expect(findings, `Files with mojibake:\n${findings.join("\n")}`).toEqual([]);
  });
});
