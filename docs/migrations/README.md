---
tags: [prisma, migraciones, baseline, replay, neon]
---

# Arquitectura activa de migraciones

## Cadena ejecutable

`prisma/migrations/` contiene una sola migración inicial:

- `20260817000000_canonical_baseline`
- SHA-256: `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e`
- 116 tablas, 240 índices y 126 foreign keys
- cero `DROP`, `DELETE` o `TRUNCATE`

El SQL activo es una copia byte-for-byte del baseline probado. No depende de
`.tmp/` y una instalación nueva ejecuta `prisma migrate deploy` desde la cadena
activa hasta obtener diff EMPTY contra `prisma/schema.prisma`.

## Dos caminos válidos

### Base vacía

`migrate deploy` ejecuta el baseline. Después se exige `migrate status` limpio,
diff EMPTY y fingerprint semántico canónico.

### Base existente equivalente

Primero se demuestra en un clon que el schema ya coincide. La adopción consiste
solo en registrar el baseline como aplicado; no se ejecuta su DDL. Producción
requiere un gate humano separado y no fue mutada durante la finalización.

## Historia anterior

Las seis migraciones previas están en [[legacy/README|el archivo forense
NO EJECUTABLE]]. Prisma no las descubre desde `prisma/migrations/`; la antigua
migración FinOps no puede reaparecer en un futuro `migrate deploy`.

Relacionado: [[../baseline-migraciones|Baseline Prisma → Neon]] ·
[[../architecture/database-migration-policy|Política]] ·
[[../incidents/2026-08-aiusage-data-loss|Incidente AiUsage]]
