#!/usr/bin/env node
/**
 * SaaS API sweep migration script.
 * Migrates console.error/log/warn to structured logger across all API routes.
 * Run: node scripts/migrate-logger.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

function findTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findTsFiles(full));
    } else if (entry.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const apiDir = join(ROOT, "app/api");
const files = findTsFiles(apiDir);

let totalFixed = 0;
let filesFixed = 0;

for (const abs of files) {
  const original = readFileSync(abs, "utf8");

  // Skip if no console calls
  if (!original.match(/console\.(error|log|warn)/)) continue;

  let content = original;

  // 1. Add logger import if missing
  const hasLogger =
    content.includes(`from "@/lib/logger"`) || content.includes(`from '@/lib/logger'`);
  if (!hasLogger) {
    // Find the last import block end and inject logger after it
    const lines = content.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimStart().startsWith("import ")) {
        lastImportIdx = i;
      }
    }
    const loggerLine = `import { logger } from "@/lib/logger";`;
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, loggerLine);
    } else {
      lines.unshift(loggerLine);
    }
    content = lines.join("\n");
  }

  // 2. Replace console.error → logger.error
  content = content.replace(/\bconsole\.error\(/g, "logger.error(");

  // 3. Replace console.warn → logger.warn
  content = content.replace(/\bconsole\.warn\(/g, "logger.warn(");

  // 4. Replace console.log → logger.info
  content = content.replace(/\bconsole\.log\(/g, "logger.info(");

  if (content !== original) {
    writeFileSync(abs, content, "utf8");
    const rel = abs.replace(ROOT + "\\", "").replace(/\\/g, "/");
    const count =
      (content.match(/logger\.(error|warn|info)\(/g) || []).length;
    console.log(`✅ ${rel} (${count} calls)`);
    totalFixed += count;
    filesFixed++;
  }
}

console.log(`\nDone: ${filesFixed} files, ${totalFixed} console calls migrated.`);
