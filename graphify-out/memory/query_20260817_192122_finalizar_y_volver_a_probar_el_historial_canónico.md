---
type: "query"
date: "2026-08-17T19:21:22.132138+00:00"
question: "Finalizar y volver a probar el historial canónico activo de migraciones Prisma sin mutar producción"
contributor: "graphify"
outcome: "useful"
source_nodes: ["lib_architecture_migration_knowledge_canonicalbaselineknowledgenode", "lib_architecture_migration_knowledge_legacymigrationarchiveknowledgenode", "lib_architecture_migration_knowledge_canonicalmodeldecisionknowledgenode"]
---

# Q: Finalizar y volver a probar el historial canónico activo de migraciones Prisma sin mutar producción

## Answer

---
tags: [auditoría, prisma, migraciones, baseline, producción-read-only, gate-humano]
---

# Finalización del historial canónico de migraciones — 2026-08-17

## Veredicto ejecutivo

El workspace contiene ahora una sola migración Prisma activa,
`20260817000000_canonical_baseline`, cuyos bytes y SHA-256 coinciden con el
artefacto previamente probado. Las seis migraciones anteriores quedaron
archivadas byte-for-byte como evidencia forense no ejecutable.

La disposición final pasó una segunda adopción sobre el clon aislado con cero
mutaciones de tablas/datos, un replay desde una base vacía con diff EMPTY y una
migración canary posterior. Producción fue consultada únicamente mediante una
transacción `REPEATABLE READ READ ONLY`; recibió cero mutaciones.

El cutover productivo **no está autorizado todavía**. El hard stop de esta fase
prohíbe el commit, por lo que un clon real del HEAD actual no contiene aún los
archivos nuevos. Además, la suite completa conserva 16 fallos no relacionados y
`git diff --check` detecta dos espacios finales preexistentes. La prueba de una
copia limpia del snapshot del workspace sí pasó, pero no sustituye un checkout
Git de una revisión comprometida y auditable.

## Identidad Git

| Campo | Valor |
|---|---|
| Rama | `feature/flowchart-mega-update` |
| `LOCAL_HEAD` | `baae86916989e04295dbaccd6b1cc18728cff960` |
| `REMOTE_TRACKING_HEAD` | `b1a747cb2b57663cbd36c3bce01f6abba400aae2` |
| Estado | Dirty; preservado, sin descarte, commit, push ni cambio de rama |

## Disposición final

La cadena ejecutable es:

```text
prisma/migrations/
├── 20260817000000_canonical_baseline/
│   └── migration.sql
└── migration_lock.toml
```

El archivo no ejecutable es `docs/migrations/legacy/`. Sus seis copias
`migration.sql` conservan nombre, cronología y hash originales. La migración
`20260812143323_finops_commercial_baseline` está clasificada
`DANGEROUS_TO_REPLAY` porque su balance `period/spentUsd/reservedUsd` contradice
el contrato financiero canónico actual.

| Control estático | Resultado |
|---|---|
| Baseline SHA-256 | `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e` |
| Tablas declaradas | 116 |
| Índices declarados | 240 |
| Foreign keys | 126 |
| `DROP` / `DELETE` / `TRUNCATE` | 0 / 0 / 0 |
| Migraciones activas | 1 |
| Migraciones legacy archivadas | 6 |
| Legacy peligrosas activas | 0 |
| Lock provider | `postgresql` |

## Segunda prueba aislada de la disposición activa

Evidencia sanitizada:
`.tmp/canonical-migration-final-proof/2026-08-17T18-46-29-118Z/`.

```text
MIGRATION_TEST_DB_URL: PRESENT
MIGRATION_TEST_TARGET: PASS
FINAL_ACTIVE_LAYOUT: PASS
FINAL_ACTIVE_CLONE_MATCHES_PRODUCTION: PASS
FINAL_EXISTING_DB_ADOPTION_PROOF: PASS
FINAL_EXISTING_DB_SCHEMA_MUTATIONS: 0
FINAL_EXISTING_DB_DATA_MUTATIONS: 0
FINAL_BASELINE_CHECKSUM_PROOF: PASS
FINAL_ACTIVE_EMPTY_REPLAY: PASS
FINAL_ACTIVE_EMPTY_DIFF: EMPTY
FINAL_ACTIVE_SCHEMA_FINGERPRINT_MATCH: PASS
FINAL_FUTURE_CANARY: PASS
PRODUCTION_MUTATIONS_THIS_RUN: 0
PRODUCTION_SCHEMA_CHANGES_THIS_RUN: 0
```

El clon y producción contenían 116 tablas de aplicación y 34,595 filas. La
metadata aislada contiene exactamente una migración terminada, sin rollback ni
logs de error, con nombre y checksum iguales al archivo activo.

El fingerprint físico del clon es
`e4fe3712c292c631bce9320725d91653a37b033b21c64a96f1e18b324d4b9331`.
El replay vacío produce el mismo contrato semántico
(`2af154b1e3997b04384daeb7d6bb850c608cb8e062f56b70da8eb84239b0d641`)
y diff Prisma EMPTY. Su orden físico de columnas difiere en 24 tablas; al
excluir únicamente `ordinal_position`, hay cero diferencias de columnas,
constraints, índices o enums. El fingerprint físico pre/post del clon, que sí
incluye ordinal, confirmó cero mutaciones durante la adopción.

La canary fue temporal y se eliminó de los artefactos locales; no aparece en la
cadena final. Las bases disposable terminaron en cero. Los intentos parciales
por timeout/conectividad se detuvieron sin inferir PASS y limpiaron sus bases.

## Simulación limpia y límite del HEAD

La copia aislada del snapshot del workspace validó inventario, hash, `prisma
validate`, `migrate deploy`, status limpio y diff EMPTY sin copiar ni depender
de `.tmp/migration-baseline-lab`. Evidencia:
`.tmp/canonical-migration-fresh-checkout/2026-08-17T18-56-46-862Z/RESULTS.json`.

Sin embargo, `prisma/migrations/20260817000000_canonical_baseline/` y otros
archivos de remediación siguen sin commit por el hard stop. Un `git clone` de
`baae869...` no puede reproducirlos. Por ello:

```text
FRESH_WORKSPACE_COPY_REPRODUCIBLE: PASS
FRESH_GIT_HEAD_CHECKOUT_REPRODUCIBLE: FAIL
FRESH_CHECKOUT_REPRODUCIBLE: FAIL
```

## ModelDecision

Estado final: `CANONICAL_ACTIVE_ENTITY`.

`ModelDecision` está en `prisma/schema.prisma`, en el baseline exacto, en el
schema productivo y tiene relaciones con `AiRun` y `Workspace`. Una instalación
nueva debe incluirla para reproducir el contrato canónico. El router y el
orquestador todavía no persisten decisiones y las tablas observadas estaban
vacías; ese es un gap de runtime separado, no una razón para clasificar la tabla
como legacy ni para ejecutar un `DROP`.

`estimatedCostUsd` permanece preservado como
`LEGACY_ESTIMATED_COST: PRESERVED_PENDING_DECISION`; no se eliminó nada.

## Seguridad de tooling y validaciones

| Gate | Resultado | Nota |
|---|---|---|
| `scripts/db-sync.mjs` | PASS | Tombstone sin cliente/conexión/capacidad de mutación; termina con error explícito |
| Prisma format check | PASS | Schema ya formateado |
| Prisma validate | PASS | Prisma 7.9 |
| Guardrails migración/FinOps/secrets | PASS | 39/39 pruebas focales |
| Typecheck | PASS | Sin errores |
| Lint | PASS | Cero errores con `--quiet`; warnings no bloqueantes en corrida normal |
| Tests completos | FAIL | 350/366; 16 fallos preexistentes/no migratorios en provider mocks, navegación lateral y orchestration E0 |
| Build | PASS | 118 páginas; URLs DB localhost no alcanzables y proveedores/mail/Stripe deshabilitados; sin mutaciones ni llamadas externas |
| Docs/Obsidian | PASS | Generación y validación sin secretos/rutas absolutas |
| Graphify | PARTIAL | Update AST final: 4,850 nodos, 8,916 edges, 374 comunidades; nodos críticos visibles. Parser SQL y extracción semántica de docs no disponibles |
| Secret scan | PASS | Ningún `.env` cambiado/staged; URLs halladas son fixtures localhost/sintéticas o placeholders documentales |
| `git diff --check` | FAIL | Espacios finales preexistentes en `scripts/seed-external-costs.ts:51,79` |

El scan de comandos peligrosos no encontró una ruta ejecutable de build/release
que use `db push`, `migrate reset` o `--accept-data-loss`. Las coincidencias
restantes son guardrails, tests, auditorías o ejemplos de SQL. La instrucción
obsoleta de `INTEGRATIONS_SETUP.md` fue reemplazada por la política forward-only.

Existe un warning futuro del cliente `pg`: antes de actualizar a pg 9 se debe
fijar/verificar explícitamente `sslmode=verify-full`.

## Auditoría de cambios

La clasificación usa el snapshot de Phase 0 para no atribuir a esta ejecución
el trabajo que ya estaba modificado.

### REQUIRED_FOR_MIGRATION_REMEDIATION

- bajas de los seis `prisma/migrations/<legacy>/migration.sql` activos;
- `prisma/migrations/20260817000000_canonical_baseline/`;
- `docs/migrations/`, `docs/baseline-migraciones.md`,
  `docs/architecture/database-migration-policy.md`, este informe y sus enlaces
  desde `docs/Home.md`/`docs/architecture/README.md`;
- `docs/incidents/2026-08-aiusage-data-loss.md` y auditorías del 17 de agosto;
- `lib/architecture/`, `scripts/migrate-isolated.mjs`,
  `scripts/prove-canonical-migrations.mjs`,
  `scripts/simulate-fresh-migration-checkout.mjs` y
  `tests/migration-safety.test.ts`;
- `.agents/AGENTS.md`, `.agents/rules/no-db-writes.md`,
  `.agents/rules/safe-build.md`, `scripts/agy-guardrail.mjs`,
  `scripts/db-sync.mjs`, `package.json`, `prisma.config.ts`,
  `prisma/schema.prisma`, `INTEGRATIONS_SETUP.md` y documentación de seguridad
  relacionada;
- `docs/.obsidian/graph.json`, `docs/generated/entities-index.md` y
  `graphify-out/{.vocab.txt,GRAPH_REPORT.md,reflections/LESSONS.md}` generados.

### INCIDENT_EVIDENCE

- `check-db.js`, `diff.sql`, `forensic.js`, `forensic2.js`, `forensic3.js`,
  `step1-2.js`;
- `scripts/audit-cols.js`, `scripts/audit-drift.js`, `scripts/audit-hash.js`,
  `scripts/audit-legacy.js`, `scripts/execute-prod-recovery-strict.js`,
  `scripts/re-audit-aiusage.js` y `scripts/recover-aiusage.js`;
- `docs/audits/`, `docs/incidents/` y memorias Graphify del 17 de agosto.

### UNRELATED_PREEXISTING

- `app/api/webhooks/stripe/route.ts`;
- `app/dashboard/billing/{billing-client.tsx,page.tsx}` y
  `app/dashboard/ops/useTaskFilters.ts`;
- las páginas `app/dashboard/settings/{integrations,preferences,profile,security,team,workspace}/page.tsx`;
- `components/publisher/IntegrationsPanel.tsx` y
  `components/settings/{BrandingManager,ProfileSettings,WhatsAppConnectCard,WorkspaceSettings}.tsx`;
- `lib/ai/finops/{billing-provider,reservation}.ts`, `lib/ai/metering.ts`,
  `lib/api-client.ts`, `lib/commercial/billing-notifier.ts`, `lib/prisma.ts` y
  `lib/user-preferences-store.ts`;
- `scripts/seed-external-costs.ts`, `scripts/test-outbox-concurrency.ts`,
  `tests/ai/finops.test.ts`, `tests/guardrail.test.ts` y los restantes cambios
  preexistentes de `README.md`, `RUNBOOK.md` y documentación de producto.

### TEMPORARY

- `.tmp/`, incluyendo evidencia sanitizada de pruebas completas y parciales;
- `graphify-out/2026-08-17/` y memorias de query generadas.

No se borraron porque contienen evidencia de auditoría. Ninguno es dependencia
del baseline activo ni del runner de fresh snapshot.

### SECRET_RISK

Ningún archivo `.env` aparece cambiado o staged. Las coincidencias de conexión
versionables son fixtures sintéticas (`localhost`, credenciales de prueba),
placeholders o aserciones de guardrail. No se imprimieron URLs reales.

## Diseño exacto del eventual registro metadata-only — NO EJECUTAR

En una ventana futura, un operador debe iniciar una shell nueva donde
`DATABASE_URL` y `DIRECT_URL` se establezcan explícitamente al mismo endpoint
**directo y previamente fingerprinted** de producción, sin aliases/fallbacks.
Después de pasar todos los preflight y recibir autorización humana específica,
el comando verificado para Prisma 7.9 sería:

```powershell
npx prisma migrate resolve --applied 20260817000000_canonical_baseline --config prisma.config.ts
```

Este comando no ejecuta `migration.sql`. Si `_prisma_migrations` está ausente,
Prisma crea su tabla de metadata y registra una fila terminada con:

- `migration_name = 20260817000000_canonical_baseline`;
- `checksum = 6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e`;
- `rolled_back_at = NULL`, sin logs de error y pasos aplicados consistentes con
  una resolución metadata-only.

La mutación esperada se limita a DDL/insert de `_prisma_migrations`; se esperan
cero cambios al schema y datos de aplicación. Puede tomar locks breves sobre la
metadata/catálogos que crea y escribe, no debe tocar tablas de aplicación.

### Preflight obligatorio, capturado de nuevo en la ventana

1. Target normalizado/fingerprint production = PASS y endpoint directo.
2. `AiUsage` = 2 y fingerprint de todas las tablas/conteos/secuencias capturado
   en transacción read-only.
3. Producción → `prisma/schema.prisma` diff = EMPTY.
4. `_prisma_migrations` = ABSENT.
5. Baseline SHA-256 exacto = el esperado.
6. Solo una migración activa; seis legacy fuera de `prisma/migrations/`.
7. Revisión Git comprometida, limpia, aprobada y reproducible desde checkout.
8. Ramas/evidencia de seguridad preservadas; cero proceso concurrente de
   migración.

Ningún dato viejo de este reporte satisface esos preflight futuros.

### Postcondiciones read-only inmediatas

1. 116 tablas de aplicación y conteos/fingerprints sin cambio; `AiUsage = 2`.
2. Estado financiero y secuencias sin cambio.
3. Schema fingerprint idéntico.
4. `_prisma_migrations` presente con exactamente la fila/nombre/checksum/estado
   esperado, sin rollback/logs.
5. `migrate status` limpio y diff EMPTY.
6. Stripe calls = 0; provider calls = 0.

Fallos que obligan a detenerse: URL/host ambiguo, fingerprint o diff distinto,
metadata ya presente, hash distinto, revisión Git distinta/sucia, permisos
insuficientes, carrera concurrente, error de conexión o estado inesperado de la
fila. No se ejecuta `migrate deploy` en la misma ventana.

## Revisión adversarial

| Pregunta | Respuesta |
|---|---|
| ¿Puede `migrate deploy` reproducir FinOps legacy? | No desde el workspace final: está fuera de `prisma/migrations/`. Falta consolidarlo en un commit auditable. |
| ¿Puede el registro baseline ejecutar DDL de aplicación? | `migrate resolve --applied` no ejecuta el SQL; solo metadata. El riesgo operativo sigue siendo apuntar al target equivocado. |
| ¿Puede diferir el hash activo del probado? | Hoy no: match exacto. El preflight futuro debe recalcularlo. |
| ¿Puede Prisma descubrir migraciones antiguas? | No en la disposición actual; están bajo `docs/migrations/legacy`. |
| ¿Puede un checkout nuevo reproducir el schema? | El snapshot copiado sí; el HEAD actual no, porque el commit está prohibido en esta fase. |
| ¿Depende CI de `.tmp`? | No; scripts/tests activos leen el baseline del repositorio. |
| ¿Puede filtrarse `.env`? | No se detectó `.env` modificado/staged ni secreto real versionable. |
| ¿Metadata afecta tablas de aplicación? | La prueba aislada confirmó 0 mutaciones de schema/datos de aplicación. |
| ¿ModelDecision cambia el baseline? | No: se resolvió `CANONICAL_ACTIVE_ENTITY` y ya está incluido en el artefacto exacto. |

## Matriz final requerida

```text
CODEX_MODEL: gpt-5.6-sol
REASONING: medium
LOCAL_HEAD: baae86916989e04295dbaccd6b1cc18728cff960
REMOTE_TRACKING_HEAD: b1a747cb2b57663cbd36c3bce01f6abba400aae2
CANONICAL_BASELINE_MIGRATION_NAME: 20260817000000_canonical_baseline
PROVEN_BASELINE_SHA256: 6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e
FINAL_ACTIVE_BASELINE_SHA256: 6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e
BASELINE_HASH_MATCH: PASS
LEGACY_MIGRATION_COUNT: 6
LEGACY_ARCHIVE_BYTE_IDENTITY: PASS
DANGEROUS_LEGACY_MIGRATIONS_ACTIVE: 0
ACTIVE_MIGRATION_COUNT: 1
FINAL_EXISTING_DB_ADOPTION_PROOF: PASS
FINAL_EXISTING_DB_SCHEMA_MUTATIONS: 0
FINAL_EXISTING_DB_DATA_MUTATIONS: 0
FINAL_ACTIVE_EMPTY_REPLAY: PASS
FINAL_ACTIVE_EMPTY_DIFF: EMPTY
FINAL_FUTURE_CANARY: PASS
FRESH_CHECKOUT_REPRODUCIBLE: FAIL
MODELDECISION_FINAL_STATE: CANONICAL_ACTIVE_ENTITY
DB_SYNC_ZERO_CAPABILITY: PASS
PRISMA_VALIDATE: PASS
TYPECHECK: PASS
TESTS: FAIL (350/366; migration-critical 39/39 PASS)
BUILD: PASS
OBSIDIAN_SYNC: PASS
GRAPHIFY_ACTIVE_ARCHITECTURE: PARTIAL
LEGACY_ESTIMATED_COST: PRESERVED_PENDING_DECISION
SECRET_SCAN: PASS
PRODUCTION_MUTATIONS_THIS_RUN: 0
PRODUCTION_SCHEMA_CHANGES_THIS_RUN: 0
PRODUCTION_BASELINE_METADATA_READY: NO
PRODUCTION_MIGRATION_READY: NO
EXACT_FUTURE_PRODUCTION_COMMAND: npx prisma migrate resolve --applied 20260817000000_canonical_baseline --config prisma.config.ts
EXPECTED_PRODUCTION_METADATA_MUTATION: create/write only _prisma_migrations metadata
EXPECTED_APPLICATION_SCHEMA_MUTATIONS: 0
EXPECTED_APPLICATION_DATA_MUTATIONS: 0
NEXT_HUMAN_GATE: audit/select required files, commit on feature branch, prove a clean Git checkout, resolve/waive unrelated validation failures, then recapture production preflight and explicitly authorize metadata-only registration
MASTER_ORCHESTRATOR_READY: NO
```

## Hard stop confirmado

No se ejecutó en producción `migrate resolve`, `migrate deploy`, `db push` ni
`db execute`; tampoco commit, push, merge, force-push, deploy, borrado de ramas
de evidencia ni Master Orchestrator.

## Outcome

- Signal: useful

## Source Nodes

- lib_architecture_migration_knowledge_canonicalbaselineknowledgenode
- lib_architecture_migration_knowledge_legacymigrationarchiveknowledgenode
- lib_architecture_migration_knowledge_canonicalmodeldecisionknowledgenode