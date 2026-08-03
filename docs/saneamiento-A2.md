# Saneamiento Fase A′ — Resumen

**Rama:** `chore/saneamiento-A2`
**Fecha:** 2026-08-03

---

## Cambios realizados

### 1. Guardián del navegador (§3.3)

**Archivos:**
- `.agents/hooks.json` — agregado `browser_subagent` como herramienta interceptada, con `on_error: "deny"` (fail-closed)
- `scripts/agy-guardrail.mjs` — reescrito para cubrir navegación:
  - Allowlist: `localhost`, `127.0.0.1`, docs de Facebook/Google/Neon/Vercel
  - Denylist: `vercel.com/dashboard`, `console.neon.tech`, `business.facebook.com`, `ads.google.com`, `*.vercel.app`, etc.
  - Herramientas desconocidas → deny (antes: allow)
  - Crash handler → deny (antes: allow)
- `tests/guardrail.test.ts` — 20 tests nuevos cubriendo denylist, allowlist, herramientas desconocidas, y regresión de comandos

### 2. Rate limiter (§2.2) — 4 tests arreglados

**Archivos:**
- `lib/ratelimit.ts` — reemplazado el bypass total en test (`return { ok: true }`) por un store in-memory que ejerce la lógica real de conteo, ventana temporal, y claves independientes. La versión de producción (DB-backed) no se tocó.

**Root cause:** Líneas 25-27 del archivo original hacían `return { ok: true, remaining: maxAttempts }` en cualquier entorno de test, anulando completamente el rate limiting.

### 3. Module status (§2.1) — 2 tests arreglados

**Archivos:**
- `lib/integrations/google/registry.ts` — `page_analytics` bajado de `ready` a `beta`, `tag_tracking` bajado de `ready` a `beta`

**Root cause:** Ambos módulos tienen OAuth funcional y resource listing (seleccionar propiedad/sitio/contenedor), pero **no tienen rutas que lean datos de negocio** (analytics, tags). El test detectaba correctamente esta brecha.

### 4. v22.0 cableada (§1)

**Archivos:**
- `app/login/page.tsx` — cambiado `process.env.NEXT_PUBLIC_META_API_VERSION || "v22.0"` a `process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0"`

**Root cause:** `NEXT_PUBLIC_META_API_VERSION` no existía en `.env`, causando que el fallback `v22.0` se activara siempre. El resto del codebase usa `NEXT_PUBLIC_FB_API_VERSION`.

---

## Verificación

| Métrica | Antes (ed96e12) | Después (A′) | Objetivo |
|---|---|---|---|
| Typecheck | 0 errores | 0 errores | ✅ 0 |
| Tests | 218/224 (6 fallan) | 242/242 (0 fallan) | ✅ todos pasan |
| Guardrail tests | no existían | 20/20 pasan | ✅ nuevo |
| Versiones cableadas | 1 | 0 | ✅ 0 |
| Hook cubre navegación | ❌ | ✅ con test propio | ✅ |

---

## Lo que quedó fuera

- **Lint core (492 warnings → 0):** Fase C′
- **Lint global (112 errores + 1,419 warnings → ≤130):** Fase C′
- **Cobertura (6.79% → ≥12%):** Fase C′
- **Seeds E2E:** Fase B′
- **Aislamiento tenant (16 rutas):** Fase B′
- **db-sync.mjs:** Documentado en `docs/pendientes-humanos.md`
- **Rotación de credenciales:** Documentado en `docs/pendientes-humanos.md`
