---
tags: [home, índice]
created: 2026-08-11
---

# FlowChart / Zefirus — Base de Conocimiento

> SaaS multi-tenant de marketing en Meta (Facebook + Instagram).
> **Producción:** [flowchart.xyz](https://flowchart.xyz) · **Hosting:** Vercel · **DB:** PostgreSQL (Neon)

---

## Navegación rápida

### 🏗️ Arquitectura
- [[architecture/README|Índice de Arquitectura]]
- [[architecture/stack|Stack Tecnológico]]
- [[architecture/multi-tenant|Modelo Multi-Tenant]]

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
- [[pendientes-humanos|Pendientes que requieren intervención humana]]

### ⚙️ Operaciones
- [[vercel-env|Variables de entorno (Vercel)]]
- [[baseline-migraciones|Baseline de migraciones]]

### 🤖 Generado automáticamente
- [[generated/README|Sobre los archivos generados]]
- [[generated/api-index|Índice de endpoints de API]]
- [[generated/entities-index|Entidades del dominio (Prisma)]]

---

## Regenerar el grafo

```bash
npm run docs:graph
```

> Genera o actualiza `docs/generated/` a partir del código fuente.
> Los archivos en esa carpeta son automáticos — no los edites manualmente.

---

## Stack en una línea

`Next.js 16` · `React 19` · `TypeScript 5` · `Prisma 7` · `PostgreSQL (Neon)` · `Tailwind CSS v4`
