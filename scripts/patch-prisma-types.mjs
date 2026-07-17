#!/usr/bin/env node
/**
 * patch-prisma-types.mjs
 *
 * Prisma 7 genera los tipos en node_modules/.prisma/client, pero el IDE
 * resuelve @prisma/client/index.d.ts (el archivo del paquete npm instalado,
 * que puede estar desactualizado respecto al schema actual).
 *
 * Este script copia los archivos .d.ts generados por `prisma generate` de
 * .prisma/client a @prisma/client para que el IDE siempre tenga los tipos
 * correctos sin necesidad de reiniciar el servidor TS.
 *
 * Se ejecuta automáticamente como postinstall + db:generate.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", ".prisma", "client");
const dest = join(root, "node_modules", "@prisma", "client");

if (!existsSync(src)) {
  console.warn("[patch-prisma] ⚠️  .prisma/client not found — run 'prisma generate' first");
  process.exit(0);
}

const files = ["index.d.ts", "default.d.ts", "index-browser.d.ts", "edge.d.ts", "extension.d.ts"];

for (const file of files) {
  const srcFile = join(src, file);
  const destFile = join(dest, file);
  if (!existsSync(srcFile)) continue;
  try {
    copyFileSync(srcFile, destFile);
    console.log(`[patch-prisma] ✅ Synced ${file}`);
  } catch (e) {
    console.warn(`[patch-prisma] ⚠️  Could not sync ${file}:`, e.message);
  }
}
