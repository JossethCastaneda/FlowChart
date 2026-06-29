# Auditoría Full-Stack — Sodare (2026-06-26)

> Auditoría **de solo lectura** del estado actual del repo. **No se aplicaron cambios estructurales**
> a propósito: el árbol de trabajo tiene un **refactor masivo sin commitear en vuelo** (ver §0) y
> editar encima crearía una colisión a tres bandas. Se documentan hallazgos y recomendaciones.
>
> Gate de compilación al momento de auditar: **`tsc --noEmit` limpio (exit 0)**.

---

## 0. 🔴 Hallazgo #1 — Refactor masivo sin commitear (colisión de proceso)

El working tree tiene **42 archivos modificados, +1585 / −2351 líneas SIN commitear**, hechos por un
**committer concurrente** (`Sodare Dev <jtrejo.lid.mkt@gmail.com>`, otra sesión/proceso — ver
[[concurrent-committer-and-onedrive]]). Es un refactor coherente (tsc pasa) pero **a medio terminar**.
Toca exactamente la infra a auditar. Bloques principales:

| Bloque | Evidencia | Estado |
|---|---|---|
| **Eliminación de QStash** | `lib/qstash.ts` ⌫, `tests/qstash.test.ts` ⌫, `app/api/jobs/publish/*` ⌫ | limpio (sin imports colgantes) |
| **Migración a Vercel Cron + Workflow DevKit** | `app/api/cron/*` (5 rutas nuevas), `workflows/sla-engine.ts`, `withWorkflow` en `next.config.ts`, dep `workflow@4.5.0` | parcial |
| **Sistema de límites de plan / paywall** | `lib/plan-limits.ts`, `hooks/use-plan-limit.ts`, `components/layout/PaywallInterceptor.tsx`, `components/settings/PlanUsageMeter.tsx`, `app/api/workspace/usage/` | nuevo |
| **Extracción de componentes Proyectos** | `components/projects/{ProjectModal,ProjectCard}.tsx`, `types/project.ts`, `types/workspace.ts`, `lib/project-constants.ts` | parcial (ver §6) |
| **Branding por workspace** | `components/settings/BrandingManager.tsx` | nuevo |

**Recomendación #0 (bloqueante):** **commitear o estabilizar este changeset ANTES** de cualquier
trabajo estructural nuevo. Mientras siga sin commitear: (a) riesgo de pérdida (un `git commit -a` ajeno
lo absorbe con mensaje equivocado), (b) imposible revisar por PR, (c) cualquier otro editor colisiona.

---

## 1. Vercel

**Bien:**
- `next.config.ts`: headers de seguridad sólidos (CSP estricta con allowlist por origen, `X-Frame-Options`,
  `nosniff`, `Referrer-Policy`, `Permissions-Policy`). CORS de `/api` con origen explícito (no wildcard) + credentials.
- `vercel.json`: `regions: ["iad1"]` (coherente con Neon `us-east-1`). 6 crons, **todos resuelven a una ruta real**.
- `ignoreBuildErrors` **eliminado** de `next.config.ts` → el build de Vercel ahora hace type-check estricto
  (era el último atajo pendiente según CLAUDE.md). ✅
- `maxDuration = 300` aplicado en rutas pesadas (dashboard analytics, etc.) → coherente con Fluid Compute.

**🟠 Colisiones / pendientes:**
1. **2 rutas cron HUÉRFANAS** (existen pero NO están en `vercel.json/crons`, nunca se ejecutarán):
   - `app/api/cron/sync-assets/route.ts`
   - `app/api/cron/meta/refresh-tokens/route.ts`
2. **Refresh de token DUPLICADO:** `vercel.json` agenda el viejo `/api/meta/refresh-token` mientras existe
   un nuevo `/api/cron/meta/refresh-tokens` (sin agendar). Hay **dos implementaciones**; reconciliar a una.
3. **Límite de plan de Vercel:** 6 cron jobs requieren plan **Pro** (Hobby permite 2). Verificar el plan;
   en Hobby el deploy de crons falla.
4. **Modo proxy:** `next.config.ts/rewrites` reenvía `/api/*` a `NEXT_PUBLIC_API_URL` (dev.sodare.xyz) si
   está seteado. Confirmar que en Producción NO esté seteado (si no, el frontend proxyea a otro backend).

---

## 2. Prisma + Neon

**Bien (`lib/prisma.ts`):**
- Prisma 7 "client engine" + `@prisma/adapter-pg` + `pg.Pool` (el patrón requerido por Prisma 7).
- Pool afinado para serverless: `max: 2` en prod (evita agotar PgBouncer), `idleTimeoutMillis: 1000`.
- Cadena de fallback de conexión `DATABASE_URL → STORAGE_POSTGRES_PRISMA_URL → STORAGE_DATABASE_URL`.
- Loguea el host destino (`[db-sync] target database host`) → ayuda a detectar el c-7/c-8 equivocado.
- Singleton con proxy "fail-loud" si falta `DATABASE_URL`. `uselibpqcompat=true` para silenciar el warning de pg v9.

**🟠 Riesgos:**
1. **`prisma db push` en cada build** (`build` script → `scripts/db-sync.mjs`). Es aditivo y no-fatal, PERO
   empuja el esquema a **la DB que resuelva `DATABASE_URL` en ese entorno**. Con la **ambigüedad c-7 vs c-8
   sin resolver** (CLAUDE.md: producción Vercel apunta a `ep-long-unit…c-7`, no a `sodare-prod`/c-8), un build
   puede mutar el esquema de la rama equivocada. **Decisión humana pendiente** de qué proyecto Neon es el oficial.
2. **`ENCRYPTION_KEY` inconsistente:** `env.ts` acepta `length(64).or(length(32))`, pero `lib/encryption.ts`
   exige **exactamente 64 hex** (`length !== 64` → falla). Una clave de 32 pasa env y rompe el cifrado. Endurecer env a `length(64)`.

---

## 3. QStash (Upstash)

- **Está siendo ELIMINADO.** `lib/qstash.ts` borrado; **cero imports colgantes** del módulo (verificado:
  ningún `from "@/lib/qstash"` ni `@upstash/qstash`). Lo que queda son comentarios, un shim no-op
  (`cancelLegacyQstashSchedule` en `lib/publisher/schedule.ts`) y flags de health-check muertos.
- ⚠️ **Contradice CLAUDE.md**, que MANDA QStash para tareas en segundo plano ("No uses setInterval…; usa
  Upstash QStash"). El reemplazo es **Vercel Cron + Workflow DevKit**. **Acción:** actualizar CLAUDE.md para
  reflejar el nuevo patrón (si la migración es la decisión oficial), o revertir si fue accidental.
- `lib/ratelimit.ts` sigue usando **Upstash Redis** — eso es **distinto** de QStash (rate-limiting, no colas)
  y es legítimo; no confundir en futuras limpiezas.
- **Limpieza pendiente:** `app/api/health/integrations/route.ts` aún reporta `qstash` leyendo `env.QSTASH_*`
  que ya NO existen en `env.ts` → siempre dará "no configurado". Quitar ese bloque del health-check.

---

## 4. Resend

- **Limpio (`lib/email.ts`).** Null-safe (sin `RESEND_API_KEY` → no-op con log, nunca lanza). `FROM` con
  cadena de fallback (`RESEND_FROM_EMAIL → EMAIL_FROM → onboarding@resend.dev`). Plantillas por import
  dinámico (`@/lib/email-templates`). Todos los `send` en try/catch con `logger`. Sin hallazgos.
- `connect-src` del CSP incluye `https://api.resend.com` → coherente.

---

## 5. Workflow DevKit (nuevo, reemplazo de QStash)

- `next.config.ts` envuelto con `withWorkflow` de `workflow/next`; dep `workflow@4.5.0`.
- `workflows/`: `publish-post.ts`, `sync-integration-assets.ts`, `sla-engine.ts` (este último recién tocado).
- Tests asociados presentes (`tests/publish-post-workflow.test.ts`, `tests/workflow-config.test.ts`).
- **Pendiente de verificar:** que los workflows se disparen desde donde antes lo hacía QStash (publicación
  programada, SLA, sync de assets) — confirmar que no quedó un camino de publicación sin disparador.

---

## 6. Estructura / type-safety (colisiones internas)

1. **🟠 Tipo `Project` DUPLICADO (migración parcial):** se creó el canónico `types/project.ts` y la lista
   `app/dashboard/proyectos/page.tsx` ya lo usa, **pero `app/dashboard/proyectos/[id]/page.tsx` aún define su
   propia `interface Project` inline.** Dos fuentes de verdad del mismo modelo → riesgo de divergencia.
   Migrar el detalle a `@/types/project`. (Otros `Project` locales en TrafficAnalytics/WhatsApp pueden ser
   shapes legítimamente distintos — revisar caso por caso.)
2. **🟠 `env` es efectivamente `any`:** en `lib/env.ts`, `parseEnv()` tiene una rama `return cleaned as any`
   (fallback de build), por lo que el tipo inferido de `export const env` se ensancha a **`any`**. Resultado:
   `env.LO_QUE_SEA` type-checkea en TODO el código aunque la var no exista en el esquema (así pasó tsc pese a
   borrar `QSTASH_*`). Esto **anula la type-safety de env** que pregona CLAUDE.md (`noImplicitAny`). Arreglo:
   tipar el retorno como `z.infer<typeof envSchema>` y castear solo dentro de la rama de build.
3. **Tests:** 25 archivos, **ninguno referencia módulos borrados** (la suite quedó coherente tras quitar
   `qstash.test.ts`). Correr `npm test` para confirmar verde tras el refactor.

---

## 7. Recomendaciones priorizadas

| # | Prioridad | Acción |
|--:|---|---|
| 0 | 🔴 Bloqueante | Commitear/estabilizar el refactor en vuelo (§0) antes de tocar estructura. Revisar por PR. |
| 1 | 🔴 Alta | Resolver la **ambigüedad Neon c-7 vs c-8** (decisión humana) — el build hace `db push` a `DATABASE_URL`. |
| 2 | 🟠 Media | Reconciliar el **refresh de token duplicado** y agendar (o borrar) las **2 rutas cron huérfanas**. |
| 3 | 🟠 Media | Tipar `env` correctamente (quitar el `any` de fan-out) y endurecer `ENCRYPTION_KEY` a `length(64)`. |
| 4 | 🟠 Media | Actualizar **CLAUDE.md**: QStash → Vercel Cron/Workflow; quitar el bloque qstash del health-check. |
| 5 | 🟢 Baja | Migrar `proyectos/[id]/page.tsx` al tipo canónico `@/types/project`. Confirmar plan Vercel (≥Pro para 6 crons). |
| 6 | 🟢 Baja | Verificar que cada disparador de QStash tenga su equivalente en Workflow/Cron (no quede publicación sin trigger). |

---

### Apéndice — comandos de verificación usados
- `tsc --noEmit` → exit 0.
- `grep` de imports `@/lib/qstash` / `@upstash/qstash` → 0 colgantes.
- Resolución de cada `vercel.json/crons[].path` a `app/api/.../route.ts` → 6/6 OK; 2 rutas cron sin agendar.
- Lectura directa: `lib/prisma.ts`, `lib/email.ts`, `lib/env.ts`, `next.config.ts`, `vercel.json`.

---

## 8. SEGUIMIENTO (acciones aplicadas tras estabilizar el árbol)

El working tree resultó estar **estático** (sin escritura concurrente — `find -mmin -3` vacío) y **verde**
(tsc + 197 tests). Por eso se estabilizó y se aplicaron las correcciones decision-free:

- **`347e3f7`** — checkpoint del refactor en curso (55 archivos), para dejar el árbol limpio.
- **`b40a791`** — eliminado el bloque QStash muerto del health-check (§3).
- **`bd72a1a`** — `lib/env.ts`: tipo de `env` restaurado (`z.infer` en vez de `any`) y `ENCRYPTION_KEY`
  endurecido a `length(64)` (§2.2, §6.2). tsc + tests verdes.

**Las 3 correcciones restantes NO se aplicaron — y tras inspección a fondo, NO son limpiezas mecánicas
sino decisiones a medio tomar del refactor (forzarlas = adivinar intención y deshacer su migración):**

1. **Shim `cancelLegacyQstashSchedule` (no-op) — es un BUG LATENTE, no código muerto.** `qStashMessageId`
   ahora guarda el **token de Workflow** (`app/api/publisher/posts/[id]/route.ts:133`), pero la cancelación
   es no-op → **reprogramar o borrar un post NO cancela el workflow pendiente** ⇒ riesgo de publicación
   doble/no deseada. **Acción del dueño del refactor:** implementar cancelación real con `workflow/api`.
2. **Refresh de token Meta DUPLICADO (decisión de arquitectura).** Existen DOS implementaciones:
   - `app/api/meta/refresh-token` (agendado): maduro — `verifyCronAuth`, `maxDuration=300`, notifica admins,
     maneja code 190, refresca por workspace. **Solo refresca el user token.**
   - `app/api/cron/meta/refresh-tokens` (HUÉRFANO, no agendado): inferior, con resto de QStash
     (`x-qstash-token`), pero **también refresca page-tokens**. No corre ⇒ no hay colisión en runtime, es
     duplicado muerto. **Decisión:** unificar (portar el refresh de page-tokens al maduro y borrar el huérfano)
     o agendar el nuevo y deprecar el viejo.
3. **Tipo `Project` con estados en CONFLICTO (migración de estados a medias).** Tres fuentes discrepan:
   `lib/project-constants.ts/STATUSES` = `[EN VUELO, EN ÓRBITA, Draft, Completado]`; `types/project.ts` añade
   `Activo`; el inline de `proyectos/[id]/page.tsx` añade `Activo` **y** `Pausado`. El refactor está migrando
   `Activo/Pausado → EN VUELO/EN ÓRBITA`. **Decisión:** fijar el enum canónico definitivo, luego migrar el
   detalle a `@/types/project` (mecánico una vez fijado el enum).
