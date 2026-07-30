# Baseline de migraciones Prisma → Neon

## Estado actual (julio 2026)

El proyecto usa **`prisma db push`** (aditivo, no-destructivo) vía `scripts/db-sync.mjs`
en cada build de Vercel. Las 5 migraciones en `prisma/migrations/` son un baseline
histórico (mayo–junio 2026); todo lo posterior se aplicó vía push.

El esquema tiene **74 modelos**. La última migración formal es del 8 de junio.
`migrate deploy` no se usa porque nunca se hizo baseline contra la DB de producción.

## Migraciones pendientes

| Archivo | Descripción | Estado |
|---|---|---|
| `docs/pending-migrations/add-ai-usage.sql` | Crea tabla `AiUsage` para metering de IA | ⏳ Pendiente |

## Procedimiento para aplicar

### Paso 0 — Verificar contra qué host apunta tu entorno

```bash
# Verificar que NO estás apuntando a producción
node -e "const u = new URL(process.env.DATABASE_URL); console.log('Host:', u.host); console.log('Database:', u.pathname.slice(1)); console.log('Branch:', u.searchParams.get('options') || 'main')"
```

**Esperado para dev:** host = `ep-xxxx-xxxx-NNNN.us-east-2.aws.neon.tech`
**PELIGRO si ves:** el host de producción (verificar en Neon Console → Settings).

### Paso 1 — Crear un branch de seguridad en Neon

```bash
# En Neon Console → Branches → Create Branch
# Nombre: backup-pre-migration-YYYYMMDD
# Desde: main (el branch de producción)
```

Esto crea un snapshot instantáneo. Si la migración sale mal, puedes apuntar
`DATABASE_URL` al branch de seguridad y redesplegar.

### Paso 2 — Aplicar la migración

**Opción A — Via db push (recomendado para cambios aditivos):**
```bash
npx prisma db push
```

**Opción B — Via SQL directo (más control):**
```bash
psql $DATABASE_URL -f docs/pending-migrations/add-ai-usage.sql
```

### Paso 3 — Verificar

```bash
npx prisma db pull          # leer esquema de la DB
npx prisma validate         # comparar con schema.prisma
npx prisma generate         # regenerar el cliente
```

### Paso 4 — Si sale mal (REVERSA)

1. **No hagas nada más en la DB.**
2. En Neon Console → Branches → selecciona el branch de seguridad.
3. Cambia `DATABASE_URL` en Vercel para apuntar al branch de seguridad.
4. Redesplegar: `git push origin <rama>:main` (o trigger manual en Vercel).
5. Investiga qué falló antes de intentar de nuevo.

Si la migración fue destructiva (DROP TABLE, ALTER COLUMN tipo incompatible),
el branch de seguridad es tu única vía de reversa. Por eso se crea ANTES.

## Para migrar a `prisma migrate deploy` (futuro)

Si se quiere pasar de `db push` a migraciones formales:

1. Crear una migración base:
   ```bash
   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/00000000000000_baseline/migration.sql
   ```
2. Marcarla como ya aplicada:
   ```bash
   npx prisma migrate resolve --applied 00000000000000_baseline
   ```
3. Verificar:
   ```bash
   npx prisma migrate status
   ```
4. Solo entonces reemplazar `db push` por `migrate deploy` en el pipeline.

**⚠️ No hacer esto sin antes verificar que las 5 migraciones existentes están
consistentes con el estado actual de la DB.** Usar `migrate status` para confirmar.
