# Baseline de migraciones Prisma → Neon

## Estado actual (julio 2026)

El proyecto usa **`prisma db push`** (aditivo, no-destructivo) en lugar de
`prisma migrate deploy`. Las 3 migraciones iniciales de mayo 2026 en
`prisma/migrations/` son un baseline histórico; todo lo demás se aplicó vía
push.

## Migraciones pendientes

| Archivo | Descripción | Estado |
|---|---|---|
| `docs/pending-migrations/ai-usage-enhance.sql` | Agrega `provider`, `estimatedCostUsd`, `feature` a `AiUsage` | Pendiente |

## Procedimiento para aplicar

1. **Verifica el host de destino** en tu `.env.local`:
   ```bash
   node -e "console.log(new URL(process.env.DATABASE_URL).host)"
   ```
   Debe ser el host de la rama dev (`ep-long-unit…c-7`), NUNCA producción directamente.

2. **Aplica con db push** (recomendado para cambios aditivos):
   ```bash
   npx prisma db push
   ```

3. **O aplica el SQL directamente** (para más control):
   ```bash
   psql $DATABASE_URL -f docs/pending-migrations/ai-usage-enhance.sql
   ```

4. **En producción**: el build de Vercel ejecuta `scripts/db-sync.mjs` que
   corre `prisma db push` automáticamente. Los cambios aditivos se aplican
   en el siguiente deploy. Cambios destructivos se reportan sin aplicar.

## Para baseline de migraciones (futuro)

Si se quiere migrar a `prisma migrate deploy`, primero:

1. Crear una migración base con `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
2. Marcarla como aplicada con `prisma migrate resolve --applied <nombre>`
3. Verificar con `prisma migrate status`
4. Solo entonces agregar `prisma migrate deploy` al pipeline
