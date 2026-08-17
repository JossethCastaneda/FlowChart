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

## 2. Crear clone dedicado para remediación de migraciones

**Prioridad:** ALTA

El camino destructivo de `db-sync` quedó neutralizado localmente. Falta crear un
branch Neon dedicado desde producción y exponerlo únicamente como
`MIGRATION_TEST_DB_URL`. No reutilizar recovery, safety ni `TEST_DB_URL`.

---

## 3. Validar y aprobar el baseline canónico

**Prioridad:** MEDIA (depende de decisión #2)

El baseline debe probarse primero desde vacío y sobre el clone de producción.
Solo después se revisará la mutación de metadata necesaria en producción. No hay
autorización actual para deploy, resolve, push o ejecución SQL productiva.

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

---

## 7. Ejecutar E2E de aislamiento tenant en navegador

**Prioridad:** ALTA

El test unitario de aislamiento (`tests/tenant-isolation-functional.test.ts`) verifica la
lógica de acceso con mocks. El test E2E de browser descrito en §5 (login como Tenant A,
fetch con IDs de B, verificar 403/404) requiere:

1. Una base de datos de test accesible
2. Ejecutar las seeds: `npx tsx prisma/seed.e2e.ts`
3. Levantar el dev server
4. Correr el spec de E2E (archivo pendiente de escribir: `e2e/aislamiento-tenant.spec.ts`)

Las seeds ya están creadas en `prisma/seed.e2e.ts` con IDs determinísticos.

---

## 8. Confirmar o proveer base de datos segura para E2E

**Prioridad:** ALTA (Bloquea la Fase A)

Actualmente `DATABASE_URL` apunta a Neon. Las reglas de saneamiento y el propio
guardián en `seed.e2e.ts` prohíben inyectar semillas si no es explícitamente una
base local o se confirma que es una rama de desarrollo.

El humano debe:
1. Proveer una base de datos local en `DATABASE_URL` en `.env.local` y asegurarse de aplicar el esquema.
2. O bien, entrar a console.neon.tech (bloqueado por denylist del navegador) y confirmar que la rama actual es de desarrollo, y ajustar `seed.e2e.ts` para permitir ese host específico.

---

- **Arquitectura de tipos Meta API:** Se requiere un refactor completo para eliminar los 362+  ny en lib/ads-metrics.ts y relacionados. Las respuestas de Graph API (como spend) llegan como strings y se usan como numbers. Requiere type boundaries fuertes.
