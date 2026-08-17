# Regla: Sin escrituras a la base de datos

## Bases reales, compartidas o desconocidas

Son de solo lectura. Se prohíben deploy/resolve/push/reset/execute, DDL, truncados,
deletes amplios, restores y cualquier sincronización implícita.

Una identidad desconocida se trata como `REAL_SHARED`. Recovery y safety son
evidencia histórica, no bases desechables.

## Razón

La base de datos de producción (Neon) se comparte entre deploys.
Un `db push` o `migrate` ejecutado sin coordinación puede:

1. Borrar columnas con datos de producción
2. Resetear secuencias de IDs
3. Corromper relaciones FK existentes

## Única excepción para experimentos

Solo `MIGRATION_TEST_DB_URL`, tras verificar que es distinta de todos los demás
targets y que el humano la autorizó como dedicada. El cambio debe seguir
EXPAND → BACKFILL → VERIFY → CUTOVER → CONTRACT LATER.

Producción usa artefactos versionados, prueba aislada, revisión y gate humano.
`scripts/db-sync.mjs` existe únicamente como comando de rechazo y no conecta.
