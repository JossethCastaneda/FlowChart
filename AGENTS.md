<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Database topology — READ THIS before touching the DB

- ⚠️ **ESTADO REAL (verificado 2026-06-15):** el `DATABASE_URL` de **Production en Vercel apunta a `ep-long-unit…c-7`** (proyecto Neon separado) desde ~2026-06-06 — los datos vivos de la app están AHÍ, no en `ep-jolly-surf`. El proyecto `sodare-prod` (`ep-jolly-surf…c-8`) tiene los datos previos al 6 de junio. Pendiente de decisión humana: migrar datos c-7→c-8 y reapuntar Vercel, o adoptar c-7 como producción oficial. NO cambiar envs de Production sin esa decisión.
- **Diseño original:** Neon project `sodare-prod` → host `ep-jolly-surf-…-pooler.c-8.us-east-1.aws.neon.tech`, database `neondb`. Vercel injects it as `DATABASE_URL` (and the Neon integration's `STORAGE_*` vars) at build & runtime.
- **Your local `.env` is NOT production.** Point `DATABASE_URL` at a **Neon dev branch** of `sodare-prod` (Neon console → Branches → create from `production`). Never point it at production directly, and never at an orphan database from another account/integration.
- **Why this matters:** a wrong `DATABASE_URL` fails silently. `prisma db push` will happily report *"already in sync"* against the wrong database while production stays untouched — which looks like "the save is broken" in the app. The build now logs the target host (`[db-sync] target database host: …`); if it isn't the `c-8`/`ep-jolly-surf` host, the env is wrong.
- `prisma.config.ts` resolves the URL with `STORAGE_*` fallbacks; `lib/prisma.ts` (runtime) reads `DATABASE_URL` only. Keep both pointing at the same DB.

## Schema workflow: `prisma db push`, not migrations

- The build runs `scripts/db-sync.mjs` → `prisma db push` (additive, **non-fatal**). New tables/columns apply automatically on deploy; a destructive diff is surfaced, never auto-applied (no `--accept-data-loss`).
- `prisma/migrations/` is a **legacy baseline**: only the three initial May-2026 migrations are recorded in `_prisma_migrations`. Everything since (WorkspaceSettings, Task request/closedAt fields, member activity status, …) was applied via `db push`. **Do not** add `prisma migrate deploy` to the pipeline without baselining first, or it will conflict with the pushed schema.
- `db-sync.mjs` drops Neon's `playing_with_neon` sample table before pushing; otherwise Prisma blocks the whole sync as "data loss".

## Seguridad — estado y pendientes (junio 2026)

- **⚠️ PENDIENTE (acción humana): rotar credenciales.** `.env.production.real`, `.env.test.vercel` y `check-prod-db.js` estuvieron comiteados con la contraseña de Neon producción y el `CRON_SECRET`. Los archivos ya están fuera del working tree/index y `.gitignore` bloquea cualquier `.env.*`, pero **siguen en el historial de git**: hay que rotar la contraseña de Neon (`neondb_owner`) y el `CRON_SECRET` en Vercel, y opcionalmente limpiar el historial (git-filter-repo/BFG).
- Endpoints eliminados por inseguros: `api/botmaker-save` (escribía tokens sin auth), `api/debug-fb`, `api/debug-google` (filtraban config). No recrearlos.
- El login con credenciales tiene rate limit en `auth.config.ts` (in-memory, por instancia — ver `lib/ratelimit.ts`).
- `decryptToken` aún acepta tokens en texto plano por compatibilidad; en producción emite warn. Tras verificar que no quedan (correr `npm run db:reencrypt`), eliminar el fallback.

## Modelo comercial: login ≠ conexión de activos (junio 2026)

- **Iniciar sesión con Facebook/Google es SOLO identidad** (email + perfil). El token de login NUNCA se guarda como integración ni se usa para leer datos; `getMetaAccessToken` ya no tiene fallback al JWT y `saveMetaTokenToWorkspace`/`api/meta/sync-token` fueron eliminados.
- **Los activos se conectan sección por sección** con consentimiento explícito: Meta vía `api/connect/[module]` (un config_id y scopes mínimos por módulo), Google vía `api/oauth/google/start?modules=…` (scopes incrementales, `include_granted_scopes`, `prompt=consent`).
- **Cumplimiento Meta:** data deletion ejecuta borrado real (`lib/meta-data-deletion.ts`), deauthorize desconecta y borra credenciales, webhooks verifican `x-hub-signature-256` (fail-closed).
- **Cumplimiento Google:** al desconectar se revoca el grant en Google (`revokeGoogleToken`); el aviso de privacidad incluye la divulgación de Uso Limitado.
- **`.env.local` debe apuntar a la rama dev de Neon** (`ep-long-unit…c-7`). Estuvo apuntando a producción y se corrigió el 2026-06-10 — verificar el host si "los datos no aparecen".
- Branding por workspace: `WorkspaceSettings.branding` (Json validado con `BrandingSchema`), expuesto en `api/workspace/settings`.

## Patrones de API (usar en rutas nuevas)

- `lib/api-handler.ts` → `withAuth` / `withWorkspace`: sesión, workspace activo y try/catch con log estructurado. Ejemplos migrados: `api/projects`, `api/resumen`, `api/notifications`, `api/workspace/settings`.
- `lib/validate.ts` (`validateBody` + Zod) para todo body; `lib/api-response.ts` para el formato de respuesta. `apiServerError` ya NO expone mensajes internos en producción.
- `lib/logger.ts` para logs (JSON estructurado con contexto); evitar `console.log` nuevo.
- Webhooks Meta: la resolución evento→proyecto usa la tabla `MetaSource` (cache externalId→projectId, se auto-puebla; se invalida al editar canales de un proyecto en `api/projects/[id]`).
- `lib/integrations/README.md` explica los DOS subsistemas de OAuth (registro multi-provider vs Google Hub) — no duplicar módulos entre ambos.

## Type-safety debt (intentional, temporary)

- `tsconfig.json` has `strict: true` **and `noImplicitAny: true`** — the type-safety gate is honest again (`npx tsc --noEmit` is clean). **CI enforces it**: `.github/workflows/ci.yml` runs `npx tsc --noEmit` (and `npm run typecheck` exists for local use). Keep it green — fix types, don't loosen the flag.
- `next.config.ts` still sets `typescript.ignoreBuildErrors: true`. This only affects `next build` (Vercel), which applies stricter Next 16 route-type checks than plain `tsc`. It's the last remaining shortcut: before removing it, run a full `next build` locally and confirm there are no route-type errors, otherwise Vercel deploys can break.
