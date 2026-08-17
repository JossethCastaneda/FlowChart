---
tags: [incidente, aiusage, finops, recuperación]
---

# Incidente AiUsage — pérdida y recuperación selectiva

## Resultado verificado

Un artefacto SQL local contiene un borrado completo de `AiUsage` seguido por la
eliminación de `estimatedCostUsd`. Producción conserva hoy exactamente dos filas
recuperadas con sus IDs históricos y una identidad sintética
`PROVENANCE_RECOVERY_<id>`.

En ambas filas, `providerCostUsd`, `customerChargeUsd` y `requestId` son nulos.
El branch recovery conserva dos filas históricas y `estimatedCostUsd` es no nulo
en ambas. Los valores no se copian a los campos financieros modernos: su destino
permanece `HUMAN_DECISION_REQUIRED`.

La decisión sobre `estimatedCostUsd` continúa pendiente y sus valores solo se
preservan como evidencia. El cierre de la cadena canónica de migraciones no los
reclasifica ni los escribe en campos financieros actuales.

La recuperación local examinada inserta únicamente `AiUsage`. No crea eventos de
billing ni invoca proveedores; producción tiene cero `BillingUsageEvent` y cero
`BillingLedgerEntry`. La ausencia de efectos externos se considera verificada
por código y evidencia local, no una reconstrucción completa de logs externos.

## Evidencia preservada

Recovery y safety son evidencia histórica y no deben eliminarse ni reutilizarse
como bases de prueba. Los hashes canónicos de las dos filas legado se guardan en
la auditoría Codex del 2026-08-17 sin exponer IDs ni montos.

Relacionado: [[../audits/2026-08-17-codex-migration-zero-trust|Auditoría Codex]] ·
[[../architecture/database-migration-policy|Política de migraciones]] ·
[[../migrations/legacy/README|Historial legacy forense]]
