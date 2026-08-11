---
tags: [generado, índice]
---

# Archivos generados automáticamente

> ⚠️ **Esta carpeta contiene archivos generados.** No los edites manualmente.
> Se sobreescriben cada vez que se ejecuta el generador.

## Cómo regenerar

```bash
npm run docs:graph
```

## Fuente

El script `scripts/docs-graph.mjs` lee:
- `lib/flowchart-kit/modules.ts` → módulos y rutas
- `app/api/*/route.ts` → endpoints de API
- `prisma/schema.prisma` → entidades del dominio

## Contenido generado

- `modules-index.md` — Mapa completo de módulos con rutas y grupos
- `api-index.md` — Índice de todos los endpoints de API
- `entities-index.md` — Entidades del dominio extraídas del schema de Prisma

## Relacionado

- [[../guides/obsidian-setup|Guía de uso del vault]]
- [[../Home|← Home]]
