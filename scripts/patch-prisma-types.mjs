#!/usr/bin/env node
/**
 * patch-prisma-types.mjs
 *
 * Prisma 7 genera los tipos en node_modules/.prisma/client pero el IDE resuelve
 * @prisma/client/index.d.ts (fecha de instalación del paquete npm — desactualizada).
 * Este script parcha los archivos .d.ts de @prisma/client para que re-exporten
 * desde .prisma/client donde viven los tipos generados reales.
 *
 * Se ejecuta automáticamente como postinstall + en prisma generate.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const clientDir = join(root, "node_modules", "@prisma", "client");

const patches = {
  "index.d.ts": "export * from '.prisma/client/index'\n",
  "default.d.ts": "export * from '.prisma/client/index'\n",
};

for (const [file, content] of Object.entries(patches)) {
  try {
    writeFileSync(join(clientDir, file), content, "utf8");
    console.log(`[patch-prisma] ✅ Patched @prisma/client/${file}`);
  } catch (e) {
    console.warn(`[patch-prisma] ⚠️  Could not patch ${file}:`, e.message);
  }
}
