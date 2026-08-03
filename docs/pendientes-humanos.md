# Pendientes que requieren intervención humana

> Estos items no pueden ser resueltos por un agente. Requieren acceso a consolas,
> decisiones de arquitectura, o coordinación con servicios externos.

---

## 1. Rotar credenciales y purgar historial de git

**Prioridad:** CRÍTICA

El historial de git contiene credenciales en texto plano (API keys, secrets).
La purga requiere:

- Poner el repo en privado temporalmente
- Ejecutar `git filter-repo` para eliminar los commits que contienen secretos
- Rotar TODAS las credenciales expuestas en Google Cloud Console, Meta Business, Neon, Vercel
- Coordinar con todos los colaboradores para que re-clonen

Un agente no debe ejecutar `filter-repo` sobre un repo con 70+ ramas — el riesgo de pérdida es irreversible.

---

## 2. db-sync.mjs — decidir migración vs push

**Prioridad:** ALTA

`package.json` → `build` ejecuta `scripts/db-sync.mjs`, que corre
`npx prisma db push --accept-data-loss` en cada deploy (línea 147),
con errores silenciados como "no fatal" (línea 149).

Consecuencias:
- 76 modelos en el schema, solo 5 migraciones (última: 2026-06-08) → 2 meses de deriva
- No hay camino de rollback si una columna se borra por accidente
- `--accept-data-loss` acepta destructive changes sin confirmación

**Decisión pendiente:** ¿migrar a `prisma migrate` con migraciones versionadas, o mantener `db push` con guardrails más estrictos?

---

## 3. Aplicar migraciones pendientes

**Prioridad:** MEDIA (depende de decisión #2)

Si se decide migrar a `prisma migrate`, hay que generar una migración baseline
que capture el estado actual del schema y aplicarla a producción.

---

## 4. Cerrar o borrar las ~70 ramas remotas

**Prioridad:** BAJA

Hay aproximadamente 70 ramas remotas vivas en GitHub. La mayoría son obsoletas.
Un humano debe revisar cuáles conservar y cuáles borrar.

---

## 5. Verificación OAuth de Google (Google Ads)

**Prioridad:** MEDIA

La app de Google Cloud está en modo "Testing". Para que clientes finales
puedan conectar Google Ads sin la pantalla de advertencia, hay que:

- Publicar la app en Google Cloud Console
- Pasar la verificación de Google (2-6 semanas para scopes restricted como `adwords`)
- Requisitos: dominio verificado, privacy policy, terms of service, video demo

Ver guía detallada en el artifact `google-oauth-fix-guide.md`.

---

## 6. URLs bloqueadas por la denylist del navegador

Las siguientes acciones quedaron bloqueadas por la política de navegación (§3.2)
y requieren que un humano las ejecute:

- Verificar configuración de la integración Neon en Vercel (console.neon.tech)
- Verificar variables de entorno en Vercel dashboard (vercel.com/dashboard)
- Verificar configuración OAuth en Google Cloud Console (console.cloud.google.com)
- Verificar tokens de acceso en Meta Business (business.facebook.com)
