# Regla: Build seguro

## Comando de build permitido

El **único** comando de build aceptado es:

```bash
SKIP_DB_SYNC=1 npx next build
```

## Comandos de build bloqueados

- `npm run build` — invoca `db-sync.mjs` que muta esquema remoto
- `npx next build` (sin `SKIP_DB_SYNC=1`) — mismo problema

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
