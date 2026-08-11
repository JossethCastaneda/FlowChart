# Reglas del Proyecto Zefirus

## 🚨 REGLA CRÍTICA: Flujo de Deploy (Git + Vercel)

**El repositorio en GitHub se llama `Zefirus`. Vercel está conectado a la rama `main` de ese repositorio y hace deploy automático al detectar un push.**

### Flujo OBLIGATORIO — SIN EXCEPCIONES:

1. **Trabaja en una rama de feature/fix** para desarrollar y validar localmente.
2. **Antes de solicitar integración**, ejecuta:
   ```bash
   npx tsc --noEmit
   ```
   y reporta el resultado.
3. No hagas commits automáticamente.
4. No hagas push automáticamente. Está prohibido enviar cambios al repositorio remoto sin autorización explícita.
5. No cambies de rama automáticamente.
6. No publiques cambios directamente en main.
7. La integración debe realizarse mediante Pull Request o revisión humana explícita.
8. Antes de cualquier commit, push, merge o despliegue, informa el diff y espera aprobación.

### Regla de oro:
> **Ningún agente puede integrar cambios en main ni desplegar sin autorización humana explícita.**
