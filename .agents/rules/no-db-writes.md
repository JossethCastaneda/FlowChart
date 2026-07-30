# Regla: Sin escrituras a la base de datos

## Comandos bloqueados — SIN EXCEPCIONES

Los siguientes comandos **nunca** deben ejecutarse desde el agente:

- `prisma db push`
- `prisma migrate deploy`
- `prisma migrate dev`
- `prisma migrate reset`
- `prisma db seed`
- `node scripts/db-sync.mjs`
- `npm run db:*` (cualquier script db)
- `node scripts/truncate-db.mjs`

## Razón

La base de datos de producción (Neon) se comparte entre deploys.
Un `db push` o `migrate` ejecutado sin coordinación puede:

1. Borrar columnas con datos de producción
2. Resetear secuencias de IDs
3. Corromper relaciones FK existentes

## Alternativa segura

Si necesitas documentar un cambio de esquema, crea un archivo SQL en
`docs/pending-migrations/` con el DDL necesario. El humano lo revisará
y aplicará manualmente.
