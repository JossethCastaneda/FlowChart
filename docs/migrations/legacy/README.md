---
tags: [prisma, migraciones, forense, no-ejecutable, incidente-aiusage]
---

# Historial legacy de migraciones Prisma — FORENSE / NO EJECUTABLE

Este directorio conserva byte-for-byte las seis migraciones que anteceden al
baseline canónico del 17 de agosto de 2026. Es evidencia histórica y no forma
parte del path ejecutable `prisma/migrations/`.

No copie estas migraciones de vuelta a la cadena activa ni las marque como
aplicadas en una base existente. La historia productiva real carecía de metadata
Prisma y la cadena antigua no reproducía el schema canónico actual.

## Inventario inmutable

| Orden | Migración | SHA-256 de `migration.sql` | Resumen DDL | Razón para excluirla del replay activo |
|---:|---|---|---|---|
| 1 | `20260529201310_init` | `5cc43bc581d59bd3f18c2c9bd3797697743708f508029f3a483b333e751be2e2` | Crea 18 tablas iniciales de auth, workspace, proyectos y contenido, con índices y FKs. | Solo representa el primer snapshot histórico; omite la mayor parte del schema productivo actual. |
| 2 | `20260529203800_add_workspace_owner_slug` | `5fd1d25bd1ffa3a4d593243ca407f4c57d8deab5ac28f2e94d80dad4b790faec` | Añade `Workspace.ownerId`/`slug`, índice único y FK. | Introduce `ownerId` temporal que la migración siguiente elimina; no es un punto cero canónico. |
| 3 | `20260529204200_workspace_plan_and_roles` | `008d1c77d3729dec7291cd6751f6f85b9f45928a47960d91a0f9636fca290c27` | Elimina `ownerId`, añade plan y aceptación de invitación. | Contiene DDL contractivo histórico y depende del estado transitorio anterior. |
| 4 | `20260608000000_add_workspace_settings` | `231ad8bee14b8dca079ab161f73d5de5c82586cc30435f23271e96a532fd193a` | Crea `WorkspaceSettings`, índice único y FK. | Es un fragmento histórico válido, pero no cubre por sí mismo la evolución posterior. |
| 5 | `20260608010000_add_task_request_fields` | `9eb9ff28622cca5513c661847359e5d1e06d41fd9ac4f6309e7db61c8cc1fd67` | Añade tres campos de solicitud a `Task`. | Es un fragmento histórico incompleto respecto al schema canónico. |
| 6 | `20260812143323_finops_commercial_baseline` | `3db7ccf16bf5e29f96149e7505ad40c8ed7ee11d64d9c9b2e4b9ba5873b5c3f6` | Crea cinco entidades FinOps/comerciales, índices y FKs. | `DANGEROUS_TO_REPLAY`: modela `WorkspaceAiBudgetBalance` con `period/spentUsd/reservedUsd`, incompatible con el balance financiero canónico actual. |

## Cadena activa sucesora

La única migración activa inicial es
`prisma/migrations/20260817000000_canonical_baseline/migration.sql`, SHA-256
`6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e`.
Fue promovida copiando los bytes exactos del artefacto probado; no se regeneró.

Relacionado: [[../../baseline-migraciones|Baseline de migraciones]] ·
[[../../incidents/2026-08-aiusage-data-loss|Incidente AiUsage]] ·
[[../../architecture/database-migration-policy|Política de migraciones]]
