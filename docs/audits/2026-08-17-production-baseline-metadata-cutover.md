---
tags: [auditoría, prisma, migraciones, baseline, cutover, cierre]
---

# Cutover de metadata del baseline canónico en producción — 2026-08-17

## Veredicto ejecutivo

El registro metadata-only del baseline `20260817000000_canonical_baseline` en
producción fue autorizado explícitamente por el humano y ejecutado una sola
vez. La verificación read-only posterior confirma cero mutaciones de esquema
o datos de aplicación. El historial de migraciones de Prisma queda
normalizado; ninguna migración forward fue desplegada.

```text
PRODUCTION_BASELINE_METADATA_REGISTERED: YES
PRISMA_MIGRATION_HISTORY_NORMALIZED: YES
PRODUCTION_FORWARD_MIGRATION_FOUNDATION_READY: YES
PRODUCTION_MIGRATION_READY: NO
MASTER_ORCHESTRATOR_READY: NO
```

## Base auditada

- Rama de auditoría: `audit/canonical-baseline-hash-verifier-20260817`
- Commit auditado: `810d88d474a5ce285fc7a800b15840fe24eaba0f`
- Padre: `ea982f0b049b2473131a8e5387bb1e91c9431e22`
- Baseline canónico: `20260817000000_canonical_baseline`
- SHA-256 del SQL activo: `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e`

Ambos valores se re-verificaron independientemente antes del cutover y de
nuevo antes de este cierre; el commit remoto no se movió.

## Comando autorizado y ejecutado

Autorización explícita del humano, alcance exacto: solo `migrate resolve
--applied`, sin `migrate deploy`, sin `db push`, con verificación inmediata
posterior.

```text
npx prisma migrate resolve \
  --applied 20260817000000_canonical_baseline \
  --config prisma.config.ts
```

Resultado:

```text
exit code: 0
"Migration 20260817000000_canonical_baseline marked as applied."
```

## Metadata resultante (verificada dos veces: inmediatamente y en este cierre)

| Campo | Valor |
|---|---|
| Filas en `_prisma_migrations` | 1 |
| `migration_name` | `20260817000000_canonical_baseline` |
| `checksum` | `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e` |
| `applied_steps_count` | 0 |
| `finished_at IS NOT NULL` | sí |
| `rolled_back_at IS NULL` | sí |

## Estado de aplicación (antes/después, idéntico)

- Mutaciones de esquema de aplicación: 0
- Mutaciones de datos de aplicación: 0
- `AiUsage`: 2
- `AiRequest`: 41
- `AiReservationLedger`: 41
- `WorkspaceAiBudgetBalance`: 1
- `BillingUsageEvent`: 0
- `BillingLedgerEntry`: 0
- `BillingRecoveryPolicy`: 0
- `BillingRecoveryCase`: 0
- `Subscription`: 0
- Tablas de aplicación: 116 (+ 1 tabla de bookkeeping de Prisma = 117 en total)
- Fingerprint de esquema (excluyendo `_prisma_migrations`):
  `b1ad4130190037a94143b197cc8fe409e0e1df93c05d036b99a307aab17131bc`
  — idéntico al fingerprint pre-cutover capturado durante el preflight.

## Gates de cierre ejecutados (read-only)

| Gate | Resultado |
|---|---|
| `migrate status` | limpio — "Database schema is up to date!" |
| Diff producción → `schema.prisma` (`migrate diff --exit-code`) | EMPTY |
| Recuperación AiUsage — dos filas históricas presentes | PASS |
| `providerCostUsd` / `customerChargeUsd` / `requestId` nulos en ambas filas | PASS |
| `npm run audit:verify-recovery-hash` | PASS (identidad, transacción read-only, 2/2 hashes, 0 mutaciones) |
| Actividad concurrente de esquema | NINGUNA (0 DDL sospechoso, 0 locks exclusivos bloqueados) |
| `scripts/db-sync.mjs` | tombstone — rechaza sin conectar |
| `build` / `release` / `postinstall` | solo `prisma generate`, sin mutación |
| `db:push` | rechaza explícitamente la sincronización directa |
| `db:migrate` | sigue enrutado por el wrapper de migración aislada |
| `prisma validate` | esquema válido |
| `typecheck` | sin errores |
| `tests/legacy-aiusage-recovery.test.ts` + `tests/migration-safety.test.ts` | 14/14 PASS |

## Llamadas externas durante este cierre

Cero llamadas a Stripe. Cero llamadas a proveedores de IA. Cero envíos de
email. Ninguna operación de red además de `git fetch`/`git push` sobre la
rama de auditoría y la conexión PostgreSQL read-only descrita arriba.

## Lo que NO se ejecutó

- `prisma migrate deploy` contra producción
- `prisma db push`
- Ninguna migración forward
- Ningún rollback
- Ninguna limpieza destructiva (`DROP`, `TRUNCATE`, `DELETE`, `CASCADE`)
- Ningún merge a `staging` o `main`
- Ningún deploy

## Estado final

- `PRODUCTION_BASELINE_METADATA_REGISTERED = YES`
- `PRISMA_MIGRATION_HISTORY_NORMALIZED = YES`
- `PRODUCTION_FORWARD_MIGRATION_FOUNDATION_READY = YES`
- `PRODUCTION_MIGRATION_READY = NO`

Razón: cada futura migración forward requiere su propio artefacto
independiente, prueba aislada, revisión y gate de autorización — este cierre
no los otorga por adelantado.

- `MASTER_ORCHESTRATOR_READY = NO`

## Relacionado

[[../baseline-migraciones|Baseline de migraciones]] ·
[[../architecture/database-migration-policy|Política de migraciones]] ·
[[../incidents/2026-08-aiusage-data-loss|Incidente AiUsage]] ·
[[2026-08-17-codex-isolated-baseline-proof-final|Prueba final de baseline aislado]] ·
[[../migrations/README|Arquitectura activa de migraciones]]
