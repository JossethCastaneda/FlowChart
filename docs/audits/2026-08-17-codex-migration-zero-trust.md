---
tags: [auditoría, prisma, migraciones, incidente, zero-trust]
---

# Auditoría Codex zero-trust de migraciones — 2026-08-17

> [!NOTE]
> Los gates de clon que aquí aparecen abiertos se completaron posteriormente.
> Ver [[2026-08-17-codex-isolated-baseline-proof-final|la prueba final]]. El gate
> de producción continúa sin autorización.

## Alcance y reglas

Auditor independiente: Codex `gpt-5.6-sol`, razonamiento medium. Producción y
branches de evidencia fueron tratados read-only. Esta ejecución realizó cero
mutaciones productivas. No hubo fetch, checkout, reset, merge, commit ni push.

Precedencia: la ley de seguridad de base de datos de esta auditoría prevalece
sobre documentación histórica que recomendaba sincronización directa. Las reglas
del repo prohíben integración directa en `main` y exigen gate humano en `staging`.

## Estado Git

| Evidencia | Resultado |
|---|---|
| Rama | `feature/flowchart-mega-update` |
| HEAD local | `baae86916989e04295dbaccd6b1cc18728cff960` |
| Tracking local de origin | `b1a747cb2b57663cbd36c3bce01f6abba400aae2` |
| Divergencia sin fetch | ahead 1, behind 0 |
| Trabajo previo preservado | 21 archivos tracked modificados; 14 artefactos untracked al iniciar |

El tracking coincide con el HEAD remoto indicado externamente, pero no se hizo
fetch; por tanto es evidencia local, no una nueva observación de GitHub.

## Ledger de claims A–L

| Claim | Fuente / comando | Resultado observado | Veredicto | Confianza | Riesgo de mutación |
|---|---|---|---|---|---|
| A — SQL destructivo de AiUsage | `diff.sql:1-3`, estado recovery/prod | Contiene borrado completo y drop de columna; recovery conserva el estado anterior | VERIFIED | Alta | Ninguno, lectura |
| B — dos filas recuperadas | SELECT read-only en producción | `AiUsage=2`; columna legado ausente | VERIFIED | Alta | Ninguno |
| C — provenance y nulos | SELECT read-only, IDs hasheados | 2/2 IDs históricos; prefix y suffix exactos; tres campos nulos | VERIFIED | Alta | Ninguno |
| D — sin replay lateral | script de recovery + conteos productivos | Solo inserta AiUsage; outbox y ledger tienen 0 filas. Logs externos no disponibles | PARTIAL | Media | Ninguno |
| E — legado no nulo y no equivalente | SELECT recovery + schema/runtime | 2/2 NON_NULL; no hay evidencia semántica para mapearlos | VERIFIED | Alta | Ninguno |
| F — metadata ausente | catálogo read-only | `_prisma_migrations` no existe | VERIFIED | Alta | Ninguno |
| G — seis pendientes | `prisma migrate status` tras revisar help | Lista las seis como no aplicadas | VERIFIED | Alta | Diagnóstico read-only |
| H — DB ahead de schema | introspección + diff | DB contiene dos tablas y cinco columnas que schema omitía | VERIFIED | Alta | Diagnóstico read-only |
| I — diff destructivo | `migrate diff` read-only | 2 drops de tabla + 3 constraints + 5 columnas | VERIFIED | Alta | SQL no ejecutado |
| J — AssetGroup/ModelDecision | introspección + searches | Ambas tablas existen; faltaban en schema | VERIFIED | Alta | Ninguno |
| K — policy fields | introspección + webhook | DB y runtime usan `hardLimitUsd` y `graceBudgetPercent` | VERIFIED | Alta | Ninguno |
| L — baseline FinOps obsoleto | migration SQL + schema + runtime + DB | Crea `period/spentUsd/reservedUsd`, no el modelo actual | VERIFIED | Alta | Ninguno |

Resumen: 11 verificados, 0 refutados, 1 parcial.

## Identidad y fingerprints sanitizados

| Target | Identidad SHA-256 corta | Estado |
|---|---|---|
| Producción (`DATABASE_URL`/`DIRECT_URL`) | `a8456b7fdbf5af0a` | misma identidad normalizada |
| Recovery | `ad7b5afac18841ed` | distinta; evidencia read-only |
| Test histórico | `d9f15ea3af833fd4` | distinta; no utilizado |
| Migration test | — | `MIGRATION_TEST_BRANCH_REQUIRED` |

Producción: PostgreSQL 17.10, DB `neondb`, schema `public`, 116 tablas,
12 workspaces. Fingerprint de columnas:
`2e11b528017be00e01cfe1729fc1cce69299fda2c7c9654741ebdcacda0fca97`.

## Recuperación AiUsage y hashes legado

| Fila | ID SHA-256 corto | Está en producción | Estado legado | SHA-256 canónico `{id, estimatedCostUsd}` |
|---|---|---|---|---|
| 1 | `6e88496a71d5` | Sí | NON_NULL | `410549b6df2c8c04a0d85b784228ba43e0ae903622cba8bf89f616b009f4b898` |
| 2 | `989dce993460` | Sí | NON_NULL | `40135c346cb613f1fa3c34a3e575b76291edc83cb861b7c5264f2481a3def874` |

Destino semántico: `HUMAN_DECISION_REQUIRED`. No se asignó a costo de proveedor
ni a cargo de cliente.

Una segunda consulta read-only recomputó ambos hashes contra los valores
registrados: `LEGACY_HASH_MATCH_ROW_1 = PASS` y
`LEGACY_HASH_MATCH_ROW_2 = PASS`.

## Migraciones locales

| Directorio | SHA-256 de `migration.sql` |
|---|---|
| `20260529201310_init` | `5cc43bc581d59bd3f18c2c9bd3797697743708f508029f3a483b333e751be2e2` |
| `20260529203800_add_workspace_owner_slug` | `5fd1d25bd1ffa3a4d593243ca407f4c57d8deab5ac28f2e94d80dad4b790faec` |
| `20260529204200_workspace_plan_and_roles` | `008d1c77d3729dec7291cd6751f6f85b9f45928a47960d91a0f9636fca290c27` |
| `20260608000000_add_workspace_settings` | `231ad8bee14b8dca079ab161f73d5de5c82586cc30435f23271e96a532fd193a` |
| `20260608010000_add_task_request_fields` | `9eb9ff28622cca5513c661847359e5d1e06d41fd9ac4f6309e7db61c8cc1fd67` |
| `20260812143323_finops_commercial_baseline` | `3db7ccf16bf5e29f96149e7505ad40c8ed7ee11d64d9c9b2e4b9ba5873b5c3f6` |

FinOps baseline: `DANGEROUS_TO_REPLAY` contra producción y obsoleto respecto al
modelo canónico. No se modificó ningún migration.sql.

## Matriz de verdad de cinco vías

| Entidad | Producción | schema local inicial | Migraciones | Runtime / diseño local | Drift y recomendación |
|---|---|---|---|---|---|
| AiUsage | actual, 2 filas recuperadas | actual sin legado | ausente en chain | metering + settlement; metering conservaba write legado inválido | DATABASE_AHEAD_OF_MIGRATIONS; quitar write legado |
| AiRequest | actual, 41 | actual | ausente | reserva y telemetría | DATABASE_AHEAD_OF_MIGRATIONS; baseline futuro |
| AiRun | actual, 0 | actual | ausente | telemetría | DATABASE_AHEAD_OF_MIGRATIONS |
| AiReservationLedger | actual, 41 | actual | definición cercana | reserve/settle/release | MIGRATIONS_AHEAD/OBSOLETE parcialmente |
| WorkspaceAiBudgetBalance | shape actual, 1 | shape actual | shape legado incompatible | enforcement financiero actual | OBSOLETE_MIGRATION; DB/schema correctos |
| BillingUsageEvent | actual, 0 | actual | ausente | outbox y dispatcher | DATABASE_AHEAD_OF_MIGRATIONS |
| BillingLedgerEntry | actual, 0 | actual | ausente | ledger declarado | DATABASE_AHEAD_OF_MIGRATIONS |
| BillingRecoveryPolicy | +2 campos, 0 filas | omitía 2 campos | shape antiguo | webhook lee ambos | DATABASE_CORRECT_SCHEMA_STALE; añadidos al schema |
| BillingRecoveryCase | actual, 0 | actual | ausente | webhook crea casos | DATABASE_AHEAD_OF_MIGRATIONS |
| ModelDecision | tabla actual, 0 | ausente | ausente | router produce auditTrail, no persiste | DATABASE_ORPHAN/LEGACY_PRESERVE; añadido sin activar claims |
| AssetGroup | tabla actual, 0 | ausente | ausente | UI consume API inexistente | RUNTIME_ORPHAN + INTENTIONAL_CURRENT_ENTITY; preservar y completar API después |
| Subscription | `currentPeriodStart`, 0 | omitía campo | ausente | webhook escribe y UI/reservation leen | DATABASE_CORRECT_SCHEMA_STALE; añadido al schema |
| Plan/PlanVersion | actuales, 0 | actuales | ausentes | catálogo comercial | DATABASE_AHEAD_OF_MIGRATIONS |

El diff también proponía eliminar `MediaAsset.tags` y `ScheduledPost.targets`;
se preservaron en schema. No se autorizó ningún DROP.

## db:sync

Estado inicial: `CRITICAL`. Ejecutaba drops con cascade, tres deletes de
deduplicación, sincronización directa aceptando pérdida de datos, tragaba errores
y terminaba exitosamente. No había caller automático en build/release local,
pero runbooks afirmaban lo contrario.

Remediación local: tombstone sin resolución de URLs ni conexión, salida no-cero;
`db:push` apunta al mismo rechazo; `db:migrate` exige target aislado. Un test
estático protege los invariantes. Riesgo residual: scripts forenses/locales
ignorados contienen operaciones destructivas y no deben ejecutarse.

## Estrategia de baseline

Preferida: baseline canónico limpio, con las seis migraciones históricas
preservadas fuera del path activo y un único baseline reproducible. Una DB vacía
ejecuta el baseline; producción equivalente solo recibe metadata después del
clone test y gate humano. No se creó el artefacto porque falta
`MIGRATION_TEST_DB_URL`.

Alternativa evaluada: chain histórica + bridge. Es reproducible en teoría desde
vacío, pero hoy requeriría atribuir a producción una migración FinOps obsoleta;
queda rechazada hasta que pueda demostrarse equivalencia.

## Artefactos de diagnóstico

- Introspección read-only SHA-256:
  `b13cab0724d70bff422135ece2645783539e4ee0dd21352addba0fb5fa65dc8b`.
- Diff DB→schema inicial SHA-256:
  `81217f8f15c35fe4b08393d63c5c89fbea2cac7b351e1ac6d6e822ffb28f2b65`.
- Diff inverso inicial SHA-256:
  `d234332b7efd4d3ffdabd4d58550d4e8cef3c2b6622552a5e92cb7c869101568`.
- Diff DB→schema después de la reconciliación SHA-256:
  `0983c8c2474f18152b093842104ef9aef25f03fb78861c9e681da2249a64a385`;
  su único contenido es el marcador de migración vacía de Prisma.

Estos SQL son evidencia y nunca fueron ejecutados.

## Gates abiertos

1. Crear `migration-schema-remediation-20260817` como clone dedicado de producción.
2. Proveerlo mediante `MIGRATION_TEST_DB_URL` y autorizar su mutación aislada.
3. Validar baseline desde vacío y sobre clone, incluyendo conteos/fingerprints.
4. Revisar el artefacto y el plan exacto de metadata.
5. Solo entonces solicitar gate humano de producción.

Hasta completar esos pasos:

- `PRODUCTION_MIGRATION_READY = NO`
- `MIGRATE_RESOLVE_PRODUCTION_READY = NO`
- `MASTER_ORCHESTRATOR_READY = NO`

## Validación local final

- Prisma format/validate: PASS.
- Diff producción→schema reconciliado: vacío.
- Typecheck: PASS.
- Lint: PASS con 0 errores y 380 warnings preexistentes.
- Tests focalizados FinOps/migration/guardrail: 33/33 PASS.
- Suite completa: FAIL, 345/361 PASS. Quedan 16 fallos ajenos a la
  remediación: 13 requieren configuración/mocks de proveedores, 2 son contratos
  de sidebar y 1 es el conflicto E0 del orchestration test.
- Build: FAIL después de compilar y pasar TypeScript; la recolección de
  `/api/cron/billing` requiere `RESEND_API_KEY`. No se inventó ni usó una clave.
- Fingerprint productivo posterior al build: sin cambios; workspaces 12,
  AiUsage 2, AiRequest 41 y AiReservationLedger 41.
- Docs generados: reconstruidos y validados (115 modelos, sin secretos/rutas absolutas).
- Graphify AST: actualizado a 4,647 nodos y 8,624 edges. Diagnóstico: cero
  endpoints missing/dangling/colapsados, un self-loop. El extractor no indexó
  19 SQL por falta de `tree_sitter_sql` y el update semántico de docs/imágenes
  quedó fuera para evitar churn masivo no relacionado; `GRAPHIFY_SYNC = PARTIAL`.
