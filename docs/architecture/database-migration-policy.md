---
tags: [arquitectura, base-de-datos, migraciones, seguridad]
---

# Política de migraciones de base de datos

## Clasificación de targets

- `REAL_SHARED`: producción, bases compartidas y cualquier identidad incierta.
- `EVIDENCE_ONLY`: branches recovery/safety; siempre read-only.
- `ISOLATED_TEST`: únicamente `MIGRATION_TEST_DB_URL`, después de demostrar que
  su identidad es distinta y que fue creado para la prueba actual.

No existe fallback de `MIGRATION_TEST_DB_URL` hacia otra variable.

## Flujo autorizado

```text
schema/runtime decision
  → reviewed migration artifact
  → empty-DB replay
  → current-production clone validation
  → human/release gate
  → explicit production deploy
  → read-only verification
```

Los cambios siguen EXPAND → BACKFILL → VERIFY → CUTOVER → CONTRACT LATER.
No se eliminan datos para satisfacer constraints y no se interpreta un diff de
Prisma como autorización para eliminar objetos.

## Guardrails locales

- `db:sync` y `db:push` rechazan la operación sin abrir conexión.
- `db:migrate` exige `MIGRATION_TEST_DB_URL` y falla si coincide con un target
  protegido conocido.
- Build y release no ejecutan migraciones.
- Los tests estáticos protegen estos invariantes.
- La cadena activa inicia en `20260817000000_canonical_baseline`; el historial
  anterior vive únicamente en `docs/migrations/legacy/` y es no ejecutable.

## Grafo de consumidores críticos

```text
AiRequest → AiRun → ModelDecision (entidad canónica; persistencia pendiente)
    │          └→ providerCost
    ├→ AiUsage → BillingUsageEvent → Stripe meter dispatcher
    └→ AiReservationLedger
             ↕
WorkspaceAiBudgetBalance → reserva / settlement / enforcement

Subscription → periodo de BillingRecoveryPolicy
                         └→ BillingRecoveryCase

AssetGroup → publisher UI (API todavía ausente)
```

`estimatedCostUsd` es evidencia histórica: no equivale automáticamente a costo
real del proveedor ni a cargo al cliente.

## Cobertura de Graphify

`ModelDecision` es `CANONICAL_ACTIVE_ENTITY` en el contrato de schema porque el
baseline, Prisma y producción incluyen la relación de auditoría. Sus cero filas
y la ausencia de writes runtime significan que la persistencia sigue pendiente;
no que la tabla sea legacy o eliminable.

Graphify no interpreta directamente los modelos de `schema.prisma`. La fuente
de relaciones compatible con su extractor AST es
`lib/architecture/migration-knowledge.ts`. Sus nodos con sufijo `GapNode`
representan ausencias comprobadas, no capacidades implementadas: la persistencia
de `ModelDecision` y la API de `AssetGroup` siguen pendientes.

Relacionado: [[../migrations/README|Arquitectura activa de migraciones]] ·
[[../migrations/legacy/README|Archivo forense legacy]]
