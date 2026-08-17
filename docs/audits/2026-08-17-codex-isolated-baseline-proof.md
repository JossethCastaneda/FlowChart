---
tags: [auditoría, prisma, migraciones, baseline, zero-trust]
---

# Prueba Codex de baseline aislado — 2026-08-17

> [!NOTE]
> Este informe conserva el bloqueo observado en la primera ejecución. El clon
> fue provisto después y la prueba quedó cerrada en
> [[2026-08-17-codex-isolated-baseline-proof-final|el informe final]].

## Veredicto ejecutivo

La prueba dinámica está bloqueada: `MIGRATION_TEST_DB_URL` no está definida.
No se usó fallback y no se abrió una conexión de laboratorio. Resultado:
`MIGRATION_TEST_BRANCH_REQUIRED`. Producción recibió cero mutaciones.

La estrategia B —baseline canónico limpio— sigue siendo la candidata preferida,
pero su veredicto es `NEEDS_REVISION/PROOF`, no `APPROVED`. Las migraciones
históricas permanecen intactas en el path activo y no se creó un baseline final.

## Git y alcance local

| Evidencia | Resultado |
|---|---|
| Rama | `feature/flowchart-mega-update` |
| HEAD local | `baae86916989e04295dbaccd6b1cc18728cff960` |
| Tracking local | `b1a747cb2b57663cbd36c3bce01f6abba400aae2` |
| Divergencia | ahead 1, behind 0; sin fetch |
| Producción | read-only; 0 mutaciones |
| Recovery/test/safety | no mutados |

El árbol ya estaba sucio y contiene trabajo del incidente y cambios no
relacionados. Nada fue reseteado, descartado, commiteado ni enviado.

## Revisión de remediación

| Cambio | Clasificación | Evidencia |
|---|---|---|
| `db-sync` tombstone | CORRECT | No resuelve URL, no conecta, termina 1 |
| build/release sin sync | CORRECT | Solo generate, patch y build |
| schema reconciliado | CORRECT/PENDING CLONE | Conserva objetos productivos; falta diff con clone |
| FinOps runtime actual | CORRECT | Usa límites de periodo y columnas customer actuales |
| write `estimatedCostUsd` eliminado | CORRECT | No fabrica equivalencia financiera |
| wrapper aislado inicial | PARTIAL | Omitía aliases y fijaba `migrate dev` |
| wrapper endurecido en esta prueba | CORRECT STATICALLY | Acción explícita, aliases protegidos y pooled alias rechazado |
| notifier Resend | CORRECTED | Validación movida de import-time a ejecución antes del lease |
| AssetGroup | PARTIAL | Tabla/UI preservadas; API ausente |
| ModelDecision | LEGACY_PRESERVE | Relación preservada; persistencia runtime ausente |

## Inventario histórico preservado

Las seis migraciones y sus SHA-256 permanecen sin modificación:

| Migración | SHA-256 |
|---|---|
| `20260529201310_init` | `5cc43bc581d59bd3f18c2c9bd3797697743708f508029f3a483b333e751be2e2` |
| `20260529203800_add_workspace_owner_slug` | `5fd1d25bd1ffa3a4d593243ca407f4c57d8deab5ac28f2e94d80dad4b790faec` |
| `20260529204200_workspace_plan_and_roles` | `008d1c77d3729dec7291cd6751f6f85b9f45928a47960d91a0f9636fca290c27` |
| `20260608000000_add_workspace_settings` | `231ad8bee14b8dca079ab161f73d5de5c82586cc30435f23271e96a532fd193a` |
| `20260608010000_add_task_request_fields` | `9eb9ff28622cca5513c661847359e5d1e06d41fd9ac4f6309e7db61c8cc1fd67` |
| `20260812143323_finops_commercial_baseline` | `3db7ccf16bf5e29f96149e7505ad40c8ed7ee11d64d9c9b2e4b9ba5873b5c3f6` |

La última sigue clasificada `DANGEROUS_TO_REPLAY`: declara el modelo financiero
antiguo `period/spentUsd/reservedUsd`.

## Estrategias

### A — cadena histórica + bridge

`REJECTED`. Preserva archivos activos, pero una DB vacía atravesaría un modelo
FinOps obsoleto y una producción existente tendría que atribuirse seis
migraciones que no describen su historia real. Un bridge no corrige esa
semántica de metadata.

### B — baseline canónico limpio

`PREFERRED, UNPROVEN`. Una DB vacía ejecutaría un único baseline; una DB
productiva equivalente registraría únicamente ese baseline como aplicado, sin
DDL. Las seis migraciones anteriores pasarían a un archivo forense no ejecutable
solo después de aprobar las dos pruebas.

### C — bridge aditivo antes del baseline

`REJECTED FOR NOW`. El schema reconciliado no requiere adiciones conocidas y un
bridge vacío no soluciona la ausencia de metadata ni el replay peligroso. Se
reconsiderará solo si el diff del clone descubre drift aditivo real.

## Baseline estático de laboratorio

Prisma 7.9.0 generó `EMPTY → prisma/schema.prisma` bajo `.tmp/`, sin datasource:

| Evidencia | Resultado |
|---|---|
| Nombre candidato | `20260817000000_canonical_baseline` |
| Schema SHA-256 | `7ce322ff13aa0add0b780fb0e7783c1723dd0339c2310c0ec0389099e0f4f377` |
| SQL SHA-256 | `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e` |
| CREATE TABLE | 116 |
| CREATE INDEX | 165 |
| CREATE UNIQUE INDEX | 75 |
| ADD FOREIGN KEY | 126 |
| DROP / DELETE / TRUNCATE | 0 / 0 / 0 |

Incluye `AssetGroup`, `ModelDecision`, las entidades Ai/FinOps críticas,
`Subscription.currentPeriodStart`, `BillingRecoveryPolicy.hardLimitUsd`,
`graceBudgetPercent` y el balance financiero moderno. Este análisis no prueba
que el SQL ejecute correctamente.

## Pruebas dinámicas no ejecutadas

- manifiesto pre-clone: no disponible;
- diff clone → schema: no ejecutado;
- `migrate resolve` en clone: no ejecutado;
- metadata `_prisma_migrations`: no creada;
- replay desde DB vacía: no ejecutado;
- canario forward: no ejecutado;
- conteos post-baseline: no disponibles.

Por tanto no existe checksum aprobado ni cadena activa final.

## Comandos candidatos para el futuro laboratorio

Solo después de identificar el clone y capturar su manifiesto:

```text
node scripts/migrate-isolated.mjs check-target
node scripts/migrate-isolated.mjs resolve --applied 20260817000000_canonical_baseline --config <lab-config>
node scripts/migrate-isolated.mjs status --config <lab-config>
```

El primer `resolve` mutaría únicamente metadata si —y solo si— el experimento
confirma que schema y datos de aplicación no cambian. No está aprobado para
producción.

## Tests y build

- Guardrails/FinOps: 35/35 PASS.
- Typecheck: PASS.
- Los 16 fallos focalizados aparecen también en un worktree detached del tracking
  base: 13 providers sin keys/mocks, 2 contratos sidebar y 1 conflicto E0. Se
  clasifican `PRE_EXISTING`, no regresiones de remediación.
- Build: PASS con una URL local inválida explícita y sin clave Resend; no hubo
  conexión productiva ni envío externo. El acoplamiento import-time fue corregido.
- Suite completa: 347/363 PASS; los 16 fallos son los mismos del tracking base.
- Lint: PASS con 0 errores y 380 warnings.
- Prisma validate, typecheck y `docs:validate`: PASS.

## Obsidian y Graphify

Las fuentes Obsidian registran la estrategia y el bloqueo. Los tres índices
generados se reconstruyeron con el generador canónico y validaron 22 módulos,
162 rutas y 115 modelos, sin secretos ni rutas absolutas.

Graphify actualizó el grafo AST a 4,709 nodos y 8,704 edges. La fuente
`lib/architecture/migration-knowledge.ts` hace navegables las relaciones
migration-critical y distingue los gaps de `AssetGroup` y `ModelDecision`.
El diagnóstico no encuentra endpoints missing/dangling ni edges colapsados,
pero conserva un self-loop. El estado global sigue `PARTIAL`: el manifest
incremental identifica 121 documentos y 219 imágenes sin cierre semántico,
20 SQL no se indexan por falta de `tree_sitter_sql` y 14 fuentes producen cero
nodos. Esos 340 candidatos semánticos preexistentes impiden declarar
`STALE_KNOWLEDGE = 0` sin una reconstrucción de corpus fuera del alcance del
baseline bloqueado.

## Gate

Crear un clone dedicado del estado productivo actual, exponerlo únicamente como
`MIGRATION_TEST_DB_URL` y volver a ejecutar la prueba completa. Hasta entonces:

- `PRODUCTION_MIGRATION_READY = NO`
- `PRODUCTION_BASELINE_METADATA_READY = NO`
- `MASTER_ORCHESTRATOR_READY = NO`
