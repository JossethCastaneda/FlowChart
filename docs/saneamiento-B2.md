# Saneamiento Fase B′ — Resumen

**Rama:** `chore/saneamiento-B2`
**Fecha:** 2026-08-03

---

## Cambios realizados

### 1. Seeds E2E (§4.2)

**Archivo:** [prisma/seed.e2e.ts](file:///c:/Users/josse/OneDrive/Documentos/Zefirus/prisma/seed.e2e.ts)

Dos tenants adversarios con IDs determinísticos:

| | Tenant A (Alfa) | Tenant B (Beta) |
|---|---|---|
| Workspace | E2E Agencia Alfa | E2E Agencia Beta |
| Owner | alfa@e2e.local (Ana Alfa) | beta@e2e.local (Bruno Beta) |
| Invited | miembro-alfa@e2e.local | miembro-beta@e2e.local |
| Project | Campaña Verano Alfa | Campaña Invierno Beta |
| Brief | Brief Lanzamiento Alfa | Brief Estrategia Beta |
| Task | Diseñar creativos Alfa | Configurar audiencias Beta |
| AI Usage | ✅ gemini-2.5-flash | ✅ gemini-2.0-flash |

Safety: el script se niega a ejecutar si `DATABASE_URL` apunta a producción (neon.tech).

### 2. Tests de aislamiento funcional (§5)

**Archivo:** [tests/tenant-isolation-functional.test.ts](file:///c:/Users/josse/OneDrive/Documentos/Zefirus/tests/tenant-isolation-functional.test.ts)

27 tests en dos capas:

**Layer 1 — Unit (11 tests):** Mock de Prisma, verificación de que:
- `verifyWorkspaceAccess(workspaceB, userA)` → false
- `verifyWorkspaceAccess(workspaceA, userA)` → true
- Roles se respetan (MEMBER no puede hacer acción de OWNER)
- `verifyProjectAccess` cruza workspace correctamente
- IDs desconocidos retornan false

**Layer 2 — Static per-handler (16 tests):** Para cada una de las 16 rutas objetivo:
- 12 rutas protegidas: verifica que cada handler (GET/POST/PATCH/DELETE/PUT) llama a `verifyWorkspaceAccess` o `verifyProjectAccess`
- 4 rutas públicas: verifica que tienen patrones de seguridad (token validation, field allowlisting)

### Hallazgo clave: Las 12 rutas protegidas ya tienen verificación

Mi auditoría inicial daba un falso positivo al buscar `verifyProjectAccess` — las rutas de `projects/[id]` y `briefs/[id]` usan el patrón equivalente:
1. `project.findUnique({ where: { id } })`
2. `verifyWorkspaceAccess(project.workspaceId, userId)`

Esto es funcionalmente idéntico a `verifyProjectAccess`. No hay brecha de seguridad.

---

## Verificación

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errores |
| `npx vitest run` | ✅ 269/269 (32 archivos) |
| Seeds creadas | ✅ 2 tenants, IDs determinísticos |
| Tests funcionales de aislamiento | ✅ 27/27 |
| Rutas con [param] sin verificación | ✅ 0 |

---

## Lo que quedó fuera

- **E2E browser test (§5)**: Requiere DB de test + dev server. Documentado en `docs/pendientes-humanos.md`
- **Lint core/global**: Fase C′
- **Cobertura**: Fase C′
