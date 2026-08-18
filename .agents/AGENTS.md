# Reglas del Proyecto FlowChart

## 🚨 REGLA CRÍTICA: Flujo de Deploy (Git + Vercel)

**El repositorio en GitHub se llama `FlowChart`. Vercel está conectado a la rama `main` de ese repositorio y hace deploy automático al detectar un push.**

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
6. **NUNCA publiques, mezcles (merge) ni hagas push directamente en `main`**, ni siquiera si el usuario pide "subir a producción".
7. La integración de los cambios autorizados para "producción" debe realizarse EXCLUSIVAMENTE en la rama `staging`.
8. Antes de cualquier commit, push, merge o despliegue a `staging`, informa el diff y espera aprobación.

### Regla de oro:
> **Ningún agente puede integrar cambios en `main` bajo NINGUNA circunstancia. Todo pase a "producción" autorizado por humanos se enviará siempre a la rama `staging` y se mantendrá controlado ahí.**

## Seguridad absoluta de base de datos

- Una base real, compartida o de identidad incierta nunca se resetea, trunca, elimina ni sincroniza destructivamente.
- Una base desconocida se clasifica como `REAL_SHARED`.
- No usar sincronización directa con aceptación de pérdida de datos ni limpieza destructiva para satisfacer constraints.
- Ninguna shadow database puede apuntar a producción, recovery, safety o una base compartida.
- Los experimentos usan exclusivamente `MIGRATION_TEST_DB_URL`, después de probar que su identidad es distinta y que es desechable.
- El flujo de cambio es: **EXPAND → BACKFILL → VERIFY → CUTOVER → CONTRACT LATER**.
- Fallar una migración no autoriza SQL manual de emergencia ni reescribir el historial aplicado.
- Producción requiere artefacto revisado, validación aislada y gate humano; build/release nunca mutan el esquema implícitamente.
