---
tags: [auditoría, aiusage, recovery, hash, prisma, producción-read-only]
---

# Corrección canónica del verificador recovery — 2026-08-17

## Resultado

`ROOT_CAUSE = HASH_CANONICALIZATION_DRIFT`.

No cambió el target recovery, no se identificó daño en datos productivos y no se
requiere reparación de base de datos ni corrección de variables de entorno. El
baseline canónico continúa siendo técnicamente correcto y la integridad de la
evidencia forense permanece en `PASS`.

## Cronología preservada

1. La auditoría zero-trust generó y verificó dos hashes históricos.
2. Un preflight posterior calculó hashes distintos y falló cerrado.
3. La investigación forense conservó el bloqueo y comparó identidad, estructura,
   representaciones y evidencia de sesión sin escribir en ninguna base.
4. Se probó que el target recovery conservaba su identidad histórica y que el
   algoritmo original volvía a producir ambos hashes documentados.
5. La diferencia quedó aislada al tipo JSON: string histórico frente a number del
   verificador ad hoc reciente.
6. Este cambio versiona el contrato y sus pruebas. El preflight productivo aún
   debe repetirse y este commit no autoriza ningún `migrate resolve`.

## Contrato canónico

La consulta recovery debe obtener la representación PostgreSQL explícita:

```sql
SELECT
  id,
  "estimatedCostUsd"::text AS "estimatedCostUsdText"
FROM "AiUsage"
ORDER BY id;
```

El hash es SHA-256 sobre bytes UTF-8, sin newline, de exactamente:

```text
JSON.stringify({
  id: <raw id>,
  estimatedCostUsd: <PostgreSQL text value>
})
```

El orden de las claves es `id`, `estimatedCostUsd`. El costo legado es un string
JSON y nunca se convierte mediante `Number`, `parseFloat`, Prisma `Float` ni una
normalización decimal.

La implementación única vive en
`lib/architecture/legacy-aiusage-recovery.ts`. El runner rastreado
`scripts/verify-legacy-aiusage-recovery.ts` abre una transacción
`REPEATABLE READ READ ONLY`, usa la consulta compartida, compara únicamente
hashes/identificadores sanitizados y ejecuta `ROLLBACK`.

## Comportamiento incorrecto identificado

El preflight ad hoc reciente seleccionó `estimatedCostUsd` sin `::text`. El
driver `pg` entregó `float8` como JavaScript `Number`, por lo que
`JSON.stringify` emitió un número JSON sin comillas. El texto numérico observado
era equivalente; las comillas explican por completo el cambio de hash.

> Nunca se debe hashear evidencia forense PostgreSQL float/numeric después de
> convertirla mediante JavaScript `Number`, salvo que esa conversión forme parte
> explícita de la especificación canónica de evidencia.

## Impacto y siguiente gate

- target recovery: sin cambio;
- reparación de DB: no requerida;
- datos recuperados en producción: intactos;
- campos financieros modernos: sin daño y sin reclasificación;
- baseline canónico: no afectado;
- integridad forense: `PASS`;
- preflight metadata-only de producción: `MUST_RERUN`.

El siguiente preflight debe ejecutar el verificador rastreado de este commit y
preservar `estimatedCostUsd::text` como string JSON. Solo después de una auditoría
externa y un preflight completo en `PASS` puede solicitarse un nuevo gate humano.

Relacionado: [[2026-08-17-codex-migration-zero-trust|Auditoría zero-trust]] ·
[[../incidents/2026-08-aiusage-data-loss|Incidente AiUsage]] ·
[[../architecture/database-migration-policy|Política de migraciones]]
