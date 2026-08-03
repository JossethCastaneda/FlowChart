# Saneamiento Fase C′ — Reporte de Puerta

**Rama:** `chore/saneamiento-C2`
**Fecha:** 2026-08-03

---

## ⛔ Puerta NO pasa

La Fase C′ requiere:

| Métrica | Objetivo | Obtenido | Estado |
|---|---|---|---|
| Lint core (lib app/api workflows) | 0 warnings | 444 warnings | 🔴 |
| Lint global | ≤130 problems | 1,484 problems (112 errors + 1,372 warnings) | 🔴 |
| Cobertura | ≥12% | 6.79% | 🔴 |
| Tests | todos pasan | ✅ 269/269 | ✅ |
| Typecheck | 0 errores | ✅ 0 | ✅ |

---

## Progreso realizado

- Eliminación segura de 54 imports no usados (492 → 444 warnings en core)
- Global: 1,523 → 1,484 problems

---

## Diagnóstico: por qué no se puede cerrar en esta sesión

### 1. `no-explicit-any` (362 en core, 862 global) — 60% del problema

Los `any` se concentran en código de integración con APIs externas:
- **Meta Graph API:** campaigns, adsets, ads, actions, insights
- **Google Ads API:** campaigns, assets
- **Webhooks:** Meta, WhatsApp
- **OAuth callbacks:** tokens, credentials

Se intentó crear interfaces (`MetaAction`, `MetaInsightsRow`) pero falló porque:
- El código trata campos string del API como números sin parseo (`ins.spend > 0`)
- Los tests existentes pasan numbers donde la API retorna strings
- Las funciones acceden a campos opcionales profundamente anidados

**Requiere:** Refactoring arquitectónico de las capas de integración (tipo boundary parsing).

### 2. `no-unused-vars` (82 en core, 412 global)

Los 82 restantes son variables locales/destructuradas, no imports:
- Variables de contexto asignadas pero nunca leídas (`workspaceId`, `role`, `member`)
- Constantes como `AUTH_SECRET` declaradas pero no usadas
- Variables catch (`err`, `error`, `e`)
- Destructuring que descarta campos (`{ accessToken, ...p }`)

**Requiere:** Revisión manual caso por caso — algunos son dead code, otros son defensivos.

### 3. React hooks errors (112 errores)

- 79× `react-hooks/set-state-in-effect` (setState directo en useEffect)
- 14× `react-hooks/static-components`
- 10× `react-hooks/immutability`

**Requiere:** Refactoring de componentes React en `components/` y `app/`.

### 4. Cobertura (6.79% → 12%)

**Requiere:** ~50-100 tests unitarios nuevos para módulos sin cobertura.

---

## Recomendación

La Fase C′ debería dividirse en sub-fases:

| Sub-fase | Alcance | Esfuerzo |
|---|---|---|
| C.1 | Unused vars (82 en core) — revisión manual | 2-3 horas |
| C.2 | React hooks errors (112 errores) | 4-6 horas |
| C.3 | Meta API types (crear boundary types) | 1-2 días |
| C.4 | Cobertura a ≥12% | 4-8 horas |
| C.5 | Lint de componentes (no-img-element, a11y) | 2-3 horas |

---

## Lo que SÍ se completó en la corrida

### Fase A′ ✅ (commit `95bc16b`)
- Guardián del navegador: hook + 20 tests
- Rate limiter: in-memory store para tests + 7 tests
- Module status: page_analytics/tag_tracking → beta
- v22.0: alineada con `NEXT_PUBLIC_FB_API_VERSION`
- Gate: 242/242 tests

### Fase B′ ✅ (commit `8b82dbc`)
- Seeds E2E: 2 tenants adversarios con IDs determinísticos
- Tests de aislamiento funcional: 27 tests (11 unit + 16 estáticos)
- Auditoría: 12/16 rutas ya protegidas, 4 públicas por diseño
- Gate: 269/269 tests

### Fase C′ — parcial (commit `c592889`)
- 54 imports no usados eliminados
- Gate: NO pasa (444 warnings vs 0 objetivo)
