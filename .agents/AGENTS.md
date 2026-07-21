# Reglas del Proyecto Zefirus

## 🚨 REGLA CRÍTICA: Flujo de Deploy (Git + Vercel)

**El repositorio en GitHub se llama `Zefirus`. Vercel está conectado a la rama `main` de ese repositorio y hace deploy automático al detectar un push.**

### Flujo OBLIGATORIO — SIN EXCEPCIONES:

1. **Trabaja en una rama de feature/fix** para desarrollar y validar localmente.
2. **Antes de subir**, corre `npx tsc --noEmit` para asegurar que no hay errores de TypeScript.
3. **Sube los cambios directo a `main`** usando:
   ```
   git push origin <tu-rama>:main
   ```
   Esto dispara el deploy en Vercel automáticamente.
4. **NO crees Pull Requests** a menos que el usuario lo pida explícitamente. Los PRs en ramas distintas a `main` NO generan deploy en Vercel y confunden al usuario.
5. **NO uses** `git push origin main` desde la rama de feature (puede fallar si no estás en main). Usa siempre `git push origin <rama-actual>:main`.

### Regla de oro:
> **Si no está en `main` → no está en producción. Si no está en producción → para el usuario no existe.**
