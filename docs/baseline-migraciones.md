---
tags: [base-de-datos, migraciones, prisma, seguridad]
---

# Baseline de migraciones Prisma → Neon

## Estado final del repositorio — 2026-08-17

- Producción tiene esquema y datos, pero no tiene `_prisma_migrations`.
- La cadena activa contiene solo `20260817000000_canonical_baseline`.
- Las seis migraciones anteriores se conservan byte-for-byte en
  [[migrations/legacy/README|un archivo forense no ejecutable]].
- La migración FinOps histórica permanece `DANGEROUS_TO_REPLAY` y ya no puede
  ser descubierta por Prisma desde el path activo.
- `schema.prisma` fue reconciliado localmente con los objetos productivos que el
  runtime necesita o que deben preservarse. Esto no aplicó DDL a producción.
- `scripts/db-sync.mjs` es ahora un tombstone que rechaza la operación y no conecta.

## Política obligatoria

1. Código y migración versionada.
2. Clone dedicado identificado por `MIGRATION_TEST_DB_URL`.
3. Snapshot de esquema y conteos antes de la prueba.
4. Aplicación aislada con estrategia EXPAND → BACKFILL → VERIFY → CUTOVER.
5. Revisión humana del SQL, locks, backfill y verificación.
6. Gate humano para producción.
7. Deploy explícito y verificación read-only.
8. CONTRACT LATER en otra ventana, nunca como limpieza automática.

Build y release no mutan esquema. Una base desconocida es `REAL_SHARED`.
Recovery y safety se conservan como evidencia; no son shadow databases.

## Estrategias evaluadas

### A. Baseline canónico limpio (seleccionada y probada)

La migración activa construye desde vacío el schema canónico. Las seis
migraciones anteriores están fuera del path activo con hashes inmutables. En una
base nueva, Prisma ejecuta el baseline completo. En una producción equivalente,
un humano registraría únicamente ese baseline como aplicado, sin ejecutar DDL,
después de repetir los preconditions read-only.

Ventajas: checksums honestos desde el nuevo punto cero, replay determinista y
historia futura simple. Coste: transición deliberada del path activo y mutación
de metadata productiva durante el gate humano.

### B. Cadena histórica + bridge forward (no elegible hoy)

Conservar las seis migraciones activas y añadir un bridge que transforme el
schema resultante hasta el estado canónico. Puede validarse desde una DB vacía,
pero baselinar producción exigiría marcar como aplicada una migración FinOps que
no representa su historia real. Se rechaza mientras esa equivalencia no pueda
demostrarse; no debe usarse solo para silenciar `migrate status`.

## Pruebas del layout activo completadas

`MIGRATION_TEST_DB_URL` fue detectada y clasificada como un clon dedicado con
host distinto de todos los targets protegidos. El clon coincidió exactamente con
producción actual antes de la prueba. La adopción metadata-only, el replay desde
vacío, el diff vacío, el status limpio y el future migration canary pasaron.

El SQL activo conserva SHA-256
`6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e`.
El clon recibió una única fila de metadata; esquema y datos de aplicación
tuvieron cero mutaciones. La base disposable fue eliminada y producción recibió
cero mutaciones.

Después de promover exactamente esos bytes a `prisma/migrations/`, el layout
final volvió a pasar adopción sobre el clon con schema/data mutations `0/0`,
replay desde otra DB vacía, status limpio, diff EMPTY, fingerprint semántico,
future migration canary y simulación de checkout fresco sin dependencia del
baseline en `.tmp`.

El orden físico de columnas difiere en 24 tablas históricas entre producción y
una instalación nueva; las 1,292 columnas semánticas, constraints, índices y
enums son idénticos y Prisma reporta diff EMPTY.

Falta auditoría humana y autorización separada para registrar metadata en
producción. Ver [[audits/2026-08-17-codex-isolated-baseline-proof-final|la
primera prueba]] y el informe final de layout activo.

Relacionado: [[architecture/database-migration-policy|Política de migraciones]] ·
[[incidents/2026-08-aiusage-data-loss|Incidente AiUsage]] ·
[[migrations/README|Arquitectura activa]]
