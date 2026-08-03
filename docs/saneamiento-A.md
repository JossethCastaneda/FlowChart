# Saneamiento Fase A — Restaurar canales de señal

**Fecha:** 2026-07-30
**Rama:** `chore/saneamiento-A`

## Resumen

Fase A del saneamiento de FlowChart: restaurar la capacidad del proyecto de detectar
sus propios problemas. Se arreglan señales rotas (versiones de API cableadas,
statuses incorrectos en módulos) y se añaden tests que convierten riesgos de
calendario en errores de build.

## Qué se arregló

### Z3 · El contrato del proyecto es ilegible → ✅ Ya resuelto (sesiones previas)

- `CLAUDE.md`: limpio (197 bytes, 0 null bytes), puntero a `.agents/AGENTS.md`
- `AGENTS.md`: limpio (1,065 bytes, 0 null bytes)
- `.gitattributes`: `*.md text eol=lf`, `*.ts text eol=lf`, `*.tsx text eol=lf`
- `tests/no-binary-docs.test.ts`: verifica null bytes y mojibake
- Mojibake: 0 hallazgos en todo el proyecto

### Z7 · Versiones de Meta Graph cableadas a mano → ✅ Ya resuelto (sesiones previas)

- 0 hardcoded `graph.facebook.com/v\d` en `lib/` y `app/`
- `lib/env.ts:78`: `META_API_VERSION: z.string().default("v25.0")`
- `tests/meta-api-version.test.ts`: existía y pasaba

### Z4 · Google Ads apunta a v19 (apagada feb 2026) → ✅ Arreglado

- Versión vigente verificada: **v25** (lanzada 22 julio 2026)
- `lib/integrations/google/google-ads.ts`: `v19` → `v25`, constante exportada
- `app/api/integrations/google/resources/ads/route.ts`: literales `v19` reemplazados
  por constante importada
- `google-ads-api` npm package: ya removido en sesiones previas
- **Test:** `tests/api-versions.test.ts` — verificado RED antes del fix → GREEN después

### Z5 · Tres de cuatro módulos Google dicen "ready" sin estarlo → ✅ Arreglado

En `lib/integrations/google/registry.ts`:

| Módulo | Antes | Después | Razón |
|---|---|---|---|
| `page_analytics` | ready | **beta** | GA4 funciona, GSC no tiene ruta de datos |
| `tag_tracking` | ready | **stub** | Solo lista contenedores |
| `google_ads` | ready | **ready** | Campañas verificadas con v25 |
| `bigquery` | stub | stub | Sin cambios |

- **Test:** `tests/module-status.test.ts` — verificado RED (3 fallos) → GREEN después

### Z12 · Registro de consumo de IA → ✅ Schema + metering + test + migración

- `model AiUsage` en schema (línea 1679): completo con todos los campos
- `lib/ai/metering.ts`: `recordAiUsage()` + `checkAiLimit()` implementados
- `tests/ai-usage.test.ts`: 13 tests pasando
- Migración SQL generada: `docs/pending-migrations/add-ai-usage.sql` — **NO aplicada**

### Z10 · Factor bus = 1 → ✅ RUNBOOK escrito

- `RUNBOOK.md`: deploy, restauración de DB, contactos de escalamiento
- Tres preguntas, nada más (como pedido)

## Qué se dejó y por qué

| Item | Razón |
|---|---|
| Migración AiUsage sin aplicar | El esquema tiene 74 modelos con 5 migraciones y `db push` como método. Aplicar sin verificar el host correcto es peligroso. Ver `docs/baseline-migraciones.md`. |
| Instrumentación de IA parcial | `metering.ts` ya instrumenta los puntos principales. Los que no pueden sin cambiar firma están anotados en el FIXME del archivo. |
| Meta versions en `tests/` | Los tests usan versiones en URLs de mock — esto es correcto y esperado. |
| `auth.config.ts` y `publish-to-meta.ts` usan fallback `|| "v25.0"` | Son fallbacks al mismo default que `lib/env.ts`. No son versiones de API cableadas — son defaults de última instancia. |

## Tests añadidos

| Test | Z | Verificó rojo | Tests |
|---|---|---|---|
| `tests/api-versions.test.ts` | Z4/Z7 | ✅ (v19 en ads route) | 1 |
| `tests/module-status.test.ts` | Z5 | ✅ (3 fallos con ready) | 2 |

Tests que ya existían de sesiones previas:
- `tests/no-binary-docs.test.ts` (Z3): 2 tests
- `tests/ai-usage.test.ts` (Z12): 13 tests
- `tests/meta-api-version.test.ts` (Z7): 1 test
# Fase A - Saneamiento

## Completado
- Medición de la línea base (Tests en verde, typecheck sin errores, lint a niveles mínimos en core).
- Limpieza de `bytes nulos` en documentación (completado anteriormente).
- Eliminación de versiones cableadas de la Graph API en el Frontend (`v21.0` / `v22.0` eliminadas y unificadas en `process.env.NEXT_PUBLIC_FB_API_VERSION`).
- Guardián del navegador extendido en `scripts/agy-guardrail.mjs` y `.agents/hooks.json` para interceptar y validar `browser_subagent` y herramientas MCP. Tests del guardián corriendo en verde.
- Semillas E2E adversarias creadas en `prisma/seed.e2e.ts` incluyendo Account, Campaña en caché, y Conversación para los tenants A y B.

## Lo que quedó fuera y por qué
- **Ejecución del test E2E (`e2e/aislamiento-tenant.spec.ts`) y de las seeds**: Quedaron bloqueados.
  - **Razón 1 (Base de datos):** El entorno actual apunta a un cluster de Neon y no es posible determinar de forma automatizada si es una rama de desarrollo segura o la base de datos de producción (lo cual viola la regla 3.1).
  - **Razón 2 (Playwright):** Se requiere instalar `@playwright/test` u otra herramienta de E2E con soporte real de navegador para llevar a cabo el test de aislamiento de sesión, y la regla 10 prohíbe instalar dependencias sin aprobación en el Implementation Plan.

Ambos bloqueos fueron derivados a `docs/pendientes-humanos.md` y al `implementation_plan.md` para revisión humana.
