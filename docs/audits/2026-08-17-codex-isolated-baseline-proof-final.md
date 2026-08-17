---
tags: [auditoría, prisma, migraciones, baseline, zero-trust, aprobado-en-clon]
---

# Prueba final Codex de baseline aislado — 2026-08-17

## Veredicto ejecutivo

El baseline canónico `20260817000000_canonical_baseline` pasó adopción
metadata-only sobre un clon dedicado del estado productivo actual, replay desde
una base vacía y una migración forward canary. Producción se mantuvo read-only y
no recibió metadata, DDL ni cambios de datos.

Esto aprueba el artefacto para auditoría humana, no autoriza el cutover. Codex se
detuvo deliberadamente antes de `migrate resolve`/`migrate deploy` en producción,
commit, push, merge y Master Orchestrator.

```text
MIGRATION_TEST_DB_URL: PRESENT
MIGRATION_TEST_TARGET: PASS
MIGRATION_TEST_CLONE_MATCHES_PRODUCTION: PASS
EXISTING_DB_BASELINE_ADOPTION: PASS
EXISTING_DB_APPLICATION_SCHEMA_MUTATIONS: 0
EXISTING_DB_APPLICATION_DATA_MUTATIONS: 0
EMPTY_DB_REPLAY: PASS
EMPTY_DB_SCHEMA_DIFF: EMPTY
FUTURE_MIGRATION_CANARY: PASS
PRODUCTION_MUTATIONS_THIS_RUN: 0
```

## Gates ejecutados

| Gate | Evidencia | Resultado |
|---|---|---|
| Target aislado | Host normalizado distinto de todos los aliases protegidos | PASS |
| Fingerprint del clon | PostgreSQL 17.10, 116 tablas, 34,595 filas | PASS |
| Clon == producción actual | Fingerprints sanitizados idénticos | PASS |
| PRE_MANIFEST | Esquema, constraints, índices, enums, conteos, hashes de contenido y secuencias | CREATED |
| Diff clon → schema | `prisma migrate diff --exit-code` | EMPTY |
| Baseline existente | `migrate resolve --applied` solo sobre el clon | PASS |
| Schema de aplicación post-resolve | Hash pre/post excluyendo `_prisma_migrations` | 0 mutaciones |
| Datos de aplicación post-resolve | Hashes de contenido/conteos/secuencias pre/post | 0 mutaciones |
| Metadata Prisma del clon | 1 fila, nombre/checksum/finished/rollback/logs verificados | PASS |
| DB vacía disposable | Creada solo en el endpoint del clon | PASS |
| Replay baseline | `migrate deploy` sobre DB disposable | PASS |
| Estado tras replay | Diff EMPTY y `migrate status` limpio | PASS |
| Future migration canary | Migración forward temporal aplicada y verificada | PASS |
| Cleanup | DB disposable eliminada; búsqueda posterior = 0 | PASS |
| Producción post-run | `_prisma_migrations` sigue ausente; fingerprint estable | READ-ONLY / 0 mutaciones |

## Fingerprints sanitizados

| Campo | Valor |
|---|---|
| Identidad corta del clon | `f5cdce6ed28c3d88` |
| Schema SHA-256 | `e4fe3712c292c631bce9320725d91653a37b033b21c64a96f1e18b324d4b9331` |
| Datos/secuencias SHA-256 | `2ad292315b4201d541d97ba0040e27c2a43a6814ac1ddd3af94dfe256d3b07b3` |
| SQL baseline SHA-256 | `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e` |
| PRE_MANIFEST SHA-256 | `2c92fc0a8b205f6613708fadded055602b378f481f35e55686871618d03134e6` |
| RESULTS SHA-256 | `3a7b51720717cabe0d7981f640fd44772cdfacc85f23ef36f27fc202d4cbb723` |

Los fingerprints contienen hashes, estructura y conteos, no credenciales ni
valores de filas. El fingerprint reducido de producción y el del clon son el
mismo artefacto SHA-256:
`ca2af2882b3355b103a10c3446ac179ea4245bbc2b27849c9653272361bdc926`.

## Artefactos

Evidencia canónica local:
`.tmp/migration-baseline-lab/evidence/2026-08-17T17-56-25-148Z/`.

- `PRE_MANIFEST.json`: estado completo antes de metadata.
- `POST_MANIFEST.json`: estado completo después de metadata.
- `production-readonly-fingerprint.json` y `clone-fingerprint.json`: comparación.
- `clone-schema-diff.json`: diff vacío.
- `RESULTS.json`: matriz final de gates.
- `run-proof.mjs`: runner reproducible con target guard, transacciones read-only,
  nombre disposable validado y cleanup en `finally`.

## Cronología y anomalías

1. Un primer lanzamiento fue terminado por el timeout de 5 segundos del shell
   durante fingerprints read-only; no alcanzó una mutación.
2. Un segundo intento confirmó target y clon == producción, pero Windows rechazó
   `spawnSync npx.cmd` con `EINVAL`; se detuvo antes de `migrate resolve`.
3. El runner se corrigió para invocar el CLI Prisma local mediante Node. La
   ejecución canónica completó todos los gates en 201.7 segundos.
4. El inspector post-run marcó inicialmente logs como fallo porque Prisma guarda
   una cadena vacía en vez de `NULL`; la aserción se corrigió a ambos estados y
   pasó. No implicó error de migración ni write adicional.

Se observó además el warning futuro de `pg` sobre semántica de `sslmode=require`.
La conexión actual se verificó con el comportamiento seguro vigente; antes de
actualizar a `pg` 9 debe fijarse explícitamente `sslmode=verify-full`.

## Diseño del eventual cutover productivo — NO EJECUTAR

El cutover propuesto es metadata-only y requiere una autorización humana nueva,
específica y posterior a esta auditoría:

1. Revisar el SQL baseline, sus hashes, PRE/POST manifests y este informe.
2. Preparar en una rama local el path activo con un único baseline canónico y
   archivar las seis migraciones históricas como evidencia no ejecutable.
3. Repetir `prisma validate`, replay desde cero, diff EMPTY, status limpio,
   tests, typecheck y revisión del diff Git.
4. Abrir una ventana controlada; capturar un fingerprint productivo read-only y
   exigir diff producción → schema EMPTY y ausencia de `_prisma_migrations`.
5. Solicitar el gate humano final mostrando el comando exacto, target sanitizado,
   checksum y plan de verificación. No usar aliases ambiguos ni fallback.
6. Solo tras esa autorización, un operador humano podría registrar
   `20260817000000_canonical_baseline` como aplicado. Ese paso crea únicamente
   metadata Prisma; no debe ejecutar el SQL baseline sobre producción existente.
7. Verificar inmediatamente una sola fila aplicada, checksum, diff EMPTY,
   `migrate status` limpio y fingerprints de esquema/datos sin cambios.
8. Detenerse ante cualquier discrepancia. No desplegar migraciones futuras en la
   misma ventana; la primera forward migration se revisa aparte.

## Stop line

No ejecutado en esta sesión:

- `prisma migrate resolve` contra producción;
- `prisma migrate deploy` contra producción;
- commit o Git push;
- merge a `staging` o `main`;
- deploy;
- Master Orchestrator.

Estado final:

- `CLONE_BASELINE_PROOF = APPROVED`
- `PRODUCTION_BASELINE_METADATA_READY = HUMAN_AUDIT_REQUIRED`
- `PRODUCTION_MIGRATION_READY = NO`
- `MASTER_ORCHESTRATOR_READY = NO`

## Obsidian y Graphify

El vault Obsidian fue regenerado y validado: 22 módulos, 162 rutas y 115
modelos; no se detectaron secretos ni rutas absolutas. Graphify ejecutó el update
AST requerido y quedó en 4,758 nodos, 8,774 edges y 364 comunidades. El nodo
`ProductionCutoverHumanGateNode` es navegable desde
`lib/architecture/migration-knowledge.ts`.

Limitaciones declaradas: 28 fuentes produjeron cero nodos, 20 SQL no se
indexaron porque `tree_sitter_sql` no está instalado y el update indicó que los
cambios semánticos de docs requieren una pasada asistida aparte. La relación de
seguridad crítica sí quedó indexada mediante AST; no se declara sincronización
semántica total.
