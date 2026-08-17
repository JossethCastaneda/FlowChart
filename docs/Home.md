---
tags: [home, índice]
created: 2026-08-11
---

# FlowChart / FlowChart — Base de Conocimiento

> SaaS multi-tenant de marketing en Meta (Facebook + Instagram).
> **Producción:** [flowchart.lat](https://flowchart.lat) · **Hosting:** Vercel · **DB:** PostgreSQL (Neon)

---

## Navegación rápida

### 🏗️ Arquitectura
- [[architecture/README|Índice de Arquitectura]]
- [[architecture/stack|Stack Tecnológico]]
- [[architecture/multi-tenant|Modelo Multi-Tenant]]
- [[architecture/database-migration-policy|Política de Migraciones]]

### 📦 Módulos
- [[modules/README|Índice de Módulos]]
- [[generated/modules-index|Mapa de Módulos (generado)]]

### 📋 Decisiones (ADR)
- [[decisions/README|Índice de Decisiones]]
- [[decisions/ADR-001-oauth-config-ids|ADR-001: Multi config_id de Meta OAuth]]

### 📖 Guías
- [[guides/README|Índice de Guías]]
- [[guides/obsidian-setup|Cómo usar este vault]]

### 🔍 Auditorías y Análisis
- [[audit-repositorio-2026-07|Auditoría de repositorio (julio 2026)]]
- [[audit-fullstack-2026-06|Auditoría fullstack (junio 2026)]]
- [[audit-channels-google-meta-2026-06|Auditoría de canales (junio 2026)]]
- [[design-system|Design System — FlowChart Ink]]
- [[design-system/FlowChart Sistema de Marca.html|Sistema Visual de Marca (HTML)]]
- [[pendientes-humanos|Pendientes que requieren intervención humana]]
- [[audits/2026-08-17-codex-migration-zero-trust|Auditoría zero-trust de migraciones]]
- [[audits/2026-08-17-codex-isolated-baseline-proof-final|Prueba final de baseline aislado]]
- [[audits/2026-08-17-codex-final-canonical-migration-history|Finalización del historial canónico de migraciones]]
- [[incidents/2026-08-aiusage-data-loss|Incidente y recuperación AiUsage]]

### ⚙️ Operaciones
- [[vercel-env|Variables de entorno (Vercel)]]
- [[baseline-migraciones|Baseline de migraciones]]

### 🤖 Generado automáticamente
- [[generated/README|Sobre los archivos generados]]
- [[generated/api-index|Índice de endpoints de API]]
- [[generated/entities-index|Entidades del dominio (Prisma)]]

---

## Regenerar el grafo (docs/generated/)

```bash
npm run docs:graph
```

> Genera o actualiza `docs/generated/` a partir del código fuente.
> Los archivos en esa carpeta son automáticos — no los edites manualmente.

---

## Grafo de conocimiento Graphify

El grafo completo del repositorio (código + docs + relaciones) vive en `graphify-out/`.

| Archivo | Descripción |
|---------|-------------|
| `graphify-out/GRAPH_REPORT.md` | Reporte del grafo — comunidades, nodos hub, conexiones |
| `graphify-out/graph.html` | Visualización interactiva (abre en browser, generado localmente) |
| `graphify-out/graph.json` | Datos raw del grafo (para queries con `graphify query`) |

**Para regenerar el grafo completo** (ejecutar desde un solo asistente a la vez):

Para Claude Code / Antigravity:
```
/graphify .
```

Para Codex:
```
$graphify .
```

**Para actualización incremental** (solo archivos cambiados):

Para Claude Code / Antigravity:
```
/graphify . --update
```

Para Codex:
```
$graphify . --update
```

**Para consultar el grafo** desde terminal:

```bash
graphify query "cómo funciona el OAuth flow?"
graphify path "MetaOAuth_Flow" "EncryptionAES256"
graphify explain "MultiTenant_Architecture"
```

---

## Stack en una línea

`Next.js 16` · `React 19` · `TypeScript 5` · `Prisma 7` · `PostgreSQL (Neon)` · `Tailwind CSS v4`
