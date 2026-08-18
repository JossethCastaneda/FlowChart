# Regla: Build seguro

## Build sin mutación de esquema

El **único** comando de build aceptado es:

```bash
npm run build
```

Los scripts `build` y `release` solo generan el cliente y compilan. No deben
invocar sincronización, deploy o push de esquema. `scripts/db-sync.mjs` falla
cerrado y no abre conexiones.

## Verificación pre-build

Antes de cualquier build, ejecuta:

```bash
npx tsc --noEmit
```

Si TypeScript reporta 0 errores, procede al build seguro.

## Verificación post-build

Después del build, ejecuta los tests:

```bash
npx vitest run tests/
```
