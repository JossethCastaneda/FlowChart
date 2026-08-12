# Regla: Deploy controlado

## Git push

El repositorio FlowChart en GitHub tiene Vercel conectado a la rama `main`.
Cada push a `main` dispara un deploy automático a producción.

### Flujo obligatorio

1. Trabaja **siempre** en una rama de feature/fix (nunca directamente en `main`).
2. Antes de pushear, verifica:
   - `npx tsc --noEmit` → 0 errores
   - `npx vitest run tests/` → todos pasando
3. Pushea a main con:
   ```bash
   git push origin <rama-actual>:main
   ```
4. **NO** crees Pull Requests salvo que el usuario lo pida explícitamente.

### Cuándo NO pushear

- Si hay cambios de esquema de Prisma sin migración aplicada
- Si el build falla con `SKIP_DB_SYNC=1 npx next build`
- Si el usuario pidió explícitamente no pushear (ej: durante saneamiento)

### Regla de oro

> Si no está en `main` → no está en producción.
> Si no está en producción → para el usuario no existe.
