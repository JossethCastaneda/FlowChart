#!/usr/bin/env node
/**
 * scripts/docs-graph.mjs
 *
 * Generador local de grafo de conocimiento para el vault Obsidian en docs/generated/.
 *
 * Fuentes (solo lectura):
 *   - lib/flowchart-kit/modules.ts → módulos y rutas
 *   - app/api/                     → endpoints de API (route.ts)
 *   - prisma/schema.prisma         → modelos del dominio
 *
 * Salida (docs/generated/):
 *   - modules-index.md   → mapa de módulos con wikilinks
 *   - api-index.md       → mapa de endpoints
 *   - entities-index.md  → modelos Prisma
 *
 * Uso:
 *   node scripts/docs-graph.mjs              # genera archivos
 *   node scripts/docs-graph.mjs --validate   # dry-run, no escribe
 *
 * SEGURIDAD:
 *   - Solo lee archivos .ts, .tsx, .prisma con extensión explícita.
 *   - Nunca lee .env, .env.*, *.pem, *.bak ni directorios excluidos.
 *   - Solo escribe en docs/generated/ (guardrail de ruta).
 *   - No usa dependencias externas (solo APIs nativas de Node ≥20).
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "docs", "generated");
const VALIDATE_ONLY = process.argv.includes("--validate");

// ── Exclusiones de seguridad ───────────────────────────────────────────────
const EXCLUDED_DIRS = new Set([
  "node_modules", ".next", ".git", ".swc", "build", "coverage",
  "dist", "out", ".vercel", "playwright-report", "test-results",
  "trace_unzip", "scratch", "cache", "dev",
]);
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".mts"]);

// ── Cabecera estándar para archivos generados ──────────────────────────────
const GENERATED_HEADER = (cmd = "npm run docs:graph") =>
  `> ⚠️ **Archivo generado automáticamente** por \`${cmd}\`.\n` +
  `> No lo edites manualmente — se sobreescribe en cada generación.\n` +
  `> Fuente: \`scripts/docs-graph.mjs\`\n\n`;

// ══════════════════════════════════════════════════════════════════════════
// LECTOR DE MÓDULOS (lib/flowchart-kit/modules.ts)
// ══════════════════════════════════════════════════════════════════════════
function parseModules() {
  const modulesFile = join(ROOT, "lib", "flowchart-kit", "modules.ts");
  if (!existsSync(modulesFile)) {
    console.warn("[docs-graph] lib/flowchart-kit/modules.ts no encontrado — omitiendo módulos");
    return [];
  }

  const content = readFileSync(modulesFile, "utf-8");
  const modules = [];

  // Extraer bloques de objeto del array MODULES usando regex conservador
  // Buscamos entradas con { key: "...", label: "...", route: "...", ... }
  const entryRegex = /\{\s*key:\s*"([^"]+)"[^}]*label:\s*"([^"]+)"[^}]*route:\s*"([^"]+)"[^}]*icon:\s*"([^"]+)"[^}]*group:\s*"([^"]+)"[^}]*\}/gs;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    modules.push({
      key: match[1],
      label: match[2],
      route: match[3],
      icon: match[4],
      group: match[5],
    });
  }

  return modules;
}

// ══════════════════════════════════════════════════════════════════════════
// LECTOR DE RUTAS DE API (app/api/**/)
// ══════════════════════════════════════════════════════════════════════════
function collectApiRoutes(dir, base = "") {
  const routes = [];
  if (!existsSync(dir)) return routes;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    const relPath = base ? `${base}/${entry}` : entry;

    if (stat.isDirectory()) {
      routes.push(...collectApiRoutes(fullPath, relPath));
    } else if (entry === "route.ts" || entry === "route.tsx") {
      const content = readFileSync(fullPath, "utf-8");
      const methods = [];
      if (/export\s+async\s+function\s+GET|export\s+const\s+GET/.test(content)) methods.push("GET");
      if (/export\s+async\s+function\s+POST|export\s+const\s+POST/.test(content)) methods.push("POST");
      if (/export\s+async\s+function\s+PUT|export\s+const\s+PUT/.test(content)) methods.push("PUT");
      if (/export\s+async\s+function\s+PATCH|export\s+const\s+PATCH/.test(content)) methods.push("PATCH");
      if (/export\s+async\s+function\s+DELETE|export\s+const\s+DELETE/.test(content)) methods.push("DELETE");

      const routePath = "/api/" + base.replace(/\\/g, "/");
      routes.push({ path: routePath, file: relative(ROOT, fullPath).replace(/\\/g, "/"), methods });
    }
  }

  return routes;
}

// ══════════════════════════════════════════════════════════════════════════
// LECTOR DE ENTIDADES PRISMA (prisma/schema.prisma)
// ══════════════════════════════════════════════════════════════════════════
function parsePrismaModels() {
  const schemaFile = join(ROOT, "prisma", "schema.prisma");
  if (!existsSync(schemaFile)) {
    console.warn("[docs-graph] prisma/schema.prisma no encontrado — omitiendo entidades");
    return [];
  }

  const content = readFileSync(schemaFile, "utf-8");
  const models = [];

  // Extraer bloques model { }
  const modelRegex = /^model\s+(\w+)\s*\{([^}]+)\}/gm;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const name = match[1];
    const body = match[2];
    // Extraer campos (líneas que tienen tipo de dato)
    const fields = [];
    const fieldRegex = /^\s+(\w+)\s+([\w\[\]?]+)/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fname = fieldMatch[1];
      const ftype = fieldMatch[2];
      // Excluir directivas de Prisma
      if (["@@", "//"].some(p => fname.startsWith(p))) continue;
      if (fname === "@@") continue;
      fields.push({ name: fname, type: ftype });
    }
    models.push({ name, fields });
  }

  return models;
}

// ══════════════════════════════════════════════════════════════════════════
// GENERADORES DE MARKDOWN
// ══════════════════════════════════════════════════════════════════════════

function generateModulesIndex(modules) {
  if (modules.length === 0) return null;

  const groups = {};
  for (const m of modules) {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  }

  const groupLabels = {
    operacion: "Operación",
    contenido: "Contenido",
    crecimiento: "Crecimiento",
    sistema: "Sistema",
  };

  let md = `---\ntags: [generado, módulos]\n---\n\n`;
  md += `# Módulos — Mapa completo\n\n`;
  md += GENERATED_HEADER();
  md += `Total: **${modules.length} módulos** en ${Object.keys(groups).length} grupos.\n\n`;

  for (const [group, mods] of Object.entries(groups)) {
    md += `## ${groupLabels[group] || group}\n\n`;
    md += `| Módulo | Ruta | Ícono |\n`;
    md += `|--------|------|-------|\n`;
    for (const m of mods) {
      md += `| **${m.label}** | \`${m.route}\` | ${m.icon} |\n`;
    }
    md += `\n`;
  }

  md += `## Relacionado\n\n`;
  md += `- [[../modules/README|Índice de módulos]]\n`;
  md += `- [[../Home|← Home]]\n`;

  return { filename: "modules-index.md", content: md };
}

function generateApiIndex(routes) {
  // Agrupar por prefijo de primer nivel
  const groups = {};
  for (const r of routes) {
    const parts = r.path.replace("/api/", "").split("/");
    const prefix = parts[0] || "root";
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(r);
  }

  let md = `---\ntags: [generado, api, endpoints]\n---\n\n`;
  md += `# API — Índice de endpoints\n\n`;
  md += GENERATED_HEADER();
  md += `Total: **${routes.length} route handlers** en ${Object.keys(groups).length} grupos.\n\n`;

  for (const [prefix, rts] of Object.entries(groups).sort()) {
    md += `## \`/api/${prefix}/\`\n\n`;
    md += `| Ruta | Métodos | Archivo |\n`;
    md += `|------|---------|--------|\n`;
    for (const r of rts.sort((a, b) => a.path.localeCompare(b.path))) {
      const methods = r.methods.length > 0 ? `\`${r.methods.join("` `")}\`` : "—";
      md += `| \`${r.path}\` | ${methods} | \`${r.file}\` |\n`;
    }
    md += `\n`;
  }

  md += `## Relacionado\n\n`;
  md += `- [[../architecture/README|Arquitectura]]\n`;
  md += `- [[../Home|← Home]]\n`;

  return { filename: "api-index.md", content: md };
}

function generateEntitiesIndex(models) {
  if (models.length === 0) return null;

  // Clasificar modelos por prefijo
  const contentModels = models.filter(m => m.name.startsWith("Content"));
  const metaModels = models.filter(m => m.name.startsWith("Meta") || m.name.startsWith("Integration") || m.name.startsWith("WaPhone"));
  const coreModels = models.filter(m =>
    ["Workspace", "WorkspaceMember", "WorkspaceInvite", "WorkspaceSettings",
     "User", "Session", "Account", "VerificationToken",
     "Project", "ProjectMember", "ProjectAlert"].includes(m.name)
  );
  const opsModels = models.filter(m =>
    ["Task", "TaskActivity", "TaskComment", "Objective", "KeyResult",
     "Brief", "Report"].includes(m.name)
  );
  const otherModels = models.filter(m =>
    !contentModels.includes(m) && !metaModels.includes(m) &&
    !coreModels.includes(m) && !opsModels.includes(m)
  );

  const renderTable = (mods) => {
    let t = `| Modelo | Campos principales |\n|--------|-------------------|\n`;
    for (const m of mods) {
      const mainFields = m.fields
        .filter(f => !["id", "createdAt", "updatedAt"].includes(f.name))
        .slice(0, 5)
        .map(f => `\`${f.name}\``)
        .join(", ");
      t += `| **${m.name}** | ${mainFields || "—"} |\n`;
    }
    return t + "\n";
  };

  let md = `---\ntags: [generado, entidades, prisma, dominio]\n---\n\n`;
  md += `# Entidades del dominio (Prisma)\n\n`;
  md += GENERATED_HEADER();
  md += `Total: **${models.length} modelos** en el schema de Prisma.\n\n`;

  if (coreModels.length) { md += `## Core (Identidad y tenant)\n\n`; md += renderTable(coreModels); }
  if (opsModels.length)  { md += `## Operaciones\n\n`;               md += renderTable(opsModels); }
  if (contentModels.length) { md += `## Contenido (Analytics orgánico)\n\n`; md += renderTable(contentModels); }
  if (metaModels.length) { md += `## Integraciones Meta / WhatsApp\n\n`; md += renderTable(metaModels); }
  if (otherModels.length){ md += `## Otros\n\n`;                     md += renderTable(otherModels); }

  md += `## Relacionado\n\n`;
  md += `- [[../architecture/multi-tenant|Modelo Multi-Tenant]]\n`;
  md += `- [[../Home|← Home]]\n`;

  return { filename: "entities-index.md", content: md };
}

// ══════════════════════════════════════════════════════════════════════════
// GUARDRAIL DE ESCRITURA — solo escribe en docs/generated/
// ══════════════════════════════════════════════════════════════════════════
function safeWrite(filename, content) {
  const target = resolve(OUT_DIR, filename);
  // Normalizar a forward-slashes para comparación agnóstica de SO
  const normalizedTarget = target.replace(/\\/g, "/");
  const normalizedOutDir = OUT_DIR.replace(/\\/g, "/");
  // Verificar que la ruta destino está dentro de OUT_DIR
  if (!normalizedTarget.startsWith(normalizedOutDir + "/") && normalizedTarget !== normalizedOutDir) {
    throw new Error(`[GUARDRAIL] Intento de escritura fuera de docs/generated/: ${target}`);
  }

  // Verificar que no es un archivo sensible
  const lower = filename.toLowerCase();
  if (lower.includes(".env") || lower.endsWith(".pem") || lower.endsWith(".key")) {
    throw new Error(`[GUARDRAIL] Intento de escribir archivo sensible: ${filename}`);
  }

  writeFileSync(target, content, "utf-8");
  console.log(`  ✓ ${relative(ROOT, target).replace(/\\/g, "/")}`);
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n📚 docs-graph.mjs — ${VALIDATE_ONLY ? "modo dry-run (--validate)" : "generando archivos"}\n`);

  // 1. Leer fuentes
  console.log("🔍 Leyendo fuentes...");
  const modules = parseModules();
  const apiRoutes = collectApiRoutes(join(ROOT, "app", "api"));
  const entities = parsePrismaModels();

  console.log(`   Módulos encontrados: ${modules.length}`);
  console.log(`   Rutas de API encontradas: ${apiRoutes.length}`);
  console.log(`   Modelos Prisma encontrados: ${entities.length}`);

  // 2. Generar contenido
  console.log("\n🔧 Generando Markdown...");
  const files = [
    generateModulesIndex(modules),
    generateApiIndex(apiRoutes),
    generateEntitiesIndex(entities),
  ].filter(Boolean);

  if (VALIDATE_ONLY) {
    console.log("\n✅ Validación completada (dry-run). Archivos que se generarían:\n");
    for (const f of files) {
      console.log(`   📄 docs/generated/${f.filename}  (${f.content.length} chars, ${f.content.split("\n").length} líneas)`);
    }

    // Verificar ausencia de secretos en el contenido generado
    const secretPatterns = ["DATABASE_URL", "NEXTAUTH_SECRET", "ENCRYPTION_KEY", "_SECRET=", "access_token="];
    let secretFound = false;
    for (const f of files) {
      for (const pattern of secretPatterns) {
        if (f.content.includes(pattern)) {
          console.error(`\n⛔ GUARDRAIL: El archivo ${f.filename} contiene patrón sensible: "${pattern}"`);
          secretFound = true;
        }
      }
    }

    // Verificar ausencia de rutas absolutas
    const absPathPatterns = ["C:\\", "D:\\", "/home/", "/Users/"];
    for (const f of files) {
      for (const pattern of absPathPatterns) {
        if (f.content.includes(pattern)) {
          console.error(`\n⛔ GUARDRAIL: El archivo ${f.filename} contiene ruta absoluta: "${pattern}"`);
          secretFound = true;
        }
      }
    }

    if (secretFound) {
      process.exit(1);
    }
    console.log("\n   Sin secretos detectados. Sin rutas absolutas. ✓");
    return;
  }

  // 3. Crear directorio de salida si no existe
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  // 4. Escribir archivos
  console.log("\n✍️  Escribiendo en docs/generated/...\n");
  for (const f of files) {
    safeWrite(f.filename, f.content);
  }

  console.log(`\n✅ Generación completada. ${files.length} archivos escritos en docs/generated/\n`);
  console.log("   Abre el vault de Obsidian para ver el grafo actualizado.\n");
}

main().catch(err => {
  console.error("\n⛔ Error en docs-graph.mjs:", err.message);
  process.exit(1);
});
