#!/usr/bin/env node
/**
 * patch-prisma-types.mjs
 *
 * Prisma 7 genera los tipos en node_modules/.prisma/client, pero el IDE
 * resuelve @prisma/client/index.d.ts (el archivo del paquete npm instalado,
 * que puede estar desactualizado respecto al schema actual).
 *
 * Este script copia SOLO index.d.ts de .prisma/client a @prisma/client.
 * El index.d.ts contiene todos los tipos generados (modelos, inputs, etc.)
 * y es el archivo que el IDE usa vía el campo "types" en package.json.
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

// Solo copiamos index.d.ts — contiene todos los tipos generados.
// No tocamos edge.d.ts, extension.d.ts ni default.d.ts para no romper
// las re-exportaciones que el runtime de Prisma necesita.
const srcFile = join(src, "index.d.ts");
const destFile = join(dest, "index.d.ts");

if (!existsSync(srcFile)) {
  console.warn("[patch-prisma] ⚠️  .prisma/client/index.d.ts not found");
  process.exit(0);
}

try {
  copyFileSync(srcFile, destFile);
  console.log("[patch-prisma] ✅ Synced @prisma/client/index.d.ts");
} catch (e) {
  console.warn("[patch-prisma] ⚠️  Could not sync index.d.ts:", e.message);
}
