import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Escáner anti-secretos: ningún archivo de código fuente debe contener
 * credenciales embebidas. Falla el build si reaparecen los patrones que
 * motivaron la remediación de junio 2026.
 */

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["app", "lib", "components", "scripts", "hooks", "stores", "prisma"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".prisma"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "generated", "migrations"]);

const PATTERNS: { name: string; regex: RegExp }[] = [
  // Connection string con credenciales (postgresql://user:pass@host)
  { name: "PostgreSQL con credenciales", regex: /postgres(ql)?:\/\/[^\s"'`]+:[^\s"'`]*@/ },
  // Passwords de Neon
  { name: "Password de Neon (npg_)", regex: /npg_[A-Za-z0-9]{8,}/ },
  // Tokens de acceso de Meta
  { name: "Token de Meta (EAA…)", regex: /["'`]EAA[A-Za-z0-9]{20,}["'`]/ },
  // Fallback hardcodeado de IDs de app/config de Meta (|| "15-16 dígitos")
  { name: "Fallback de config/app ID de Meta", regex: /\|\|\s*["']\d{15,16}["']/ },
  // Verify token conocido del webhook
  { name: "Verify token hardcodeado", regex: /flowchart_webhook_verify/ },
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) yield* walk(full);
    } else if (EXTENSIONS.has(full.slice(full.lastIndexOf(".")))) {
      yield full;
    }
  }
}

describe("anti-secretos", () => {
  it("no hay credenciales embebidas en el código fuente", () => {
    const findings: string[] = [];
    for (const dir of SCAN_DIRS) {
      let files: Generator<string>;
      try {
        files = walk(join(ROOT, dir));
      } catch {
        continue; // el directorio puede no existir
      }
      for (const file of files) {
        const content = readFileSync(file, "utf8");
        for (const { name, regex } of PATTERNS) {
          if (regex.test(content)) {
            findings.push(`${relative(ROOT, file)} → ${name}`);
          }
        }
      }
    }
    expect(findings, `Secretos detectados:\n${findings.join("\n")}`).toEqual([]);
  });
});
