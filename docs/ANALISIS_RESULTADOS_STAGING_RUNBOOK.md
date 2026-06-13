# Análisis de Resultados — Runbook de Staging

Guía para llevar el módulo a **staging** con **integración real progresiva** de Cari AI y Botmaker, sin romper mocks ni dashboards. Las checklists de cada proveedor están en:
- [`docs/integrations/CARI_AI_INTEGRATION_CHECKLIST.md`](./integrations/CARI_AI_INTEGRATION_CHECKLIST.md)
- [`docs/integrations/BOTMAKER_INTEGRATION_CHECKLIST.md`](./integrations/BOTMAKER_INTEGRATION_CHECKLIST.md)

Reporte de implementación: [`docs/ANALISIS_RESULTADOS_IMPLEMENTATION_REPORT.md`](./ANALISIS_RESULTADOS_IMPLEMENTATION_REPORT.md).

---

## 1. Variables de entorno

| Variable | Uso | Obligatoria en staging |
|---|---|---|
| `DATABASE_URL` | Conexión Postgres (pooled) | ✅ |
| `DIRECT_URL` | Conexión directa para DDL (`prisma db push`) | ✅ (deploys con migración) |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Sesión next-auth (existente) | ✅ |
| Clave de cifrado de `encryptToken` (existente, p. ej. `ENCRYPTION_KEY`) | Cifra credenciales de integraciones (AES-256) | ✅ |
| `ANALYTICS_PII_SALT` | Sal del hash de PII (`lib/analytics/privacy.ts`) | ✅ **(si falta, en producción se usa un fallback público y el hash es predecible — hay warning en logs)** |
| `SKIP_DB_SYNC=1` | Saltar `db push` en build local sin DB | Opcional (solo local) |

> Las credenciales de Cari AI / Botmaker **no** son variables de entorno: se guardan **cifradas** por workspace en la tabla `Integration` vía la UI de configuración. Nunca se loguean ni se devuelven en claro (solo enmascaradas).

---

## 2. Setup en staging

```bash
# 1. Instalar dependencias
npm install

# 2. Aplicar el esquema (additivo; no destructivo)
#    Requiere DATABASE_URL/DIRECT_URL apuntando a la BD de staging.
npx prisma db push
npx prisma generate

# 3. (Opcional) Sembrar datos mock para validar todos los dashboards
npx tsx scripts/generate-analytics-mocks.ts
```

El seed crea ~1.000 conversaciones + mensajes en el **primer workspace** existente, con agentes, colas, servicios, campañas, tags, CSAT/NPS y casos resueltos/abandonados/transferidos. Es idempotente por workspace (borra los normalizados previos del workspace antes de insertar).

---

## 3. Comandos de verificación

```bash
npm run typecheck   # tsc --noEmit  → 0 errores esperados
npm run test        # vitest run    → incluye KPIs, outcome rules, multi-tenant, normalización y fixtures de proveedor
SKIP_DB_SYNC=1 npm run build   # next build (sin tocar BD)
npm run lint        # eslint (ver baseline preexistente en el reporte)
```

---

## 4. Activar integración real progresiva (sin romper mocks)

El patrón de adaptadores permite migrar reporte por reporte:

1. **Confirmar el endpoint** de un reporte con el proveedor (usar la checklist correspondiente).
2. En el adaptador (`lib/analytics/adapters/{CariAi,Botmaker}AnalyticsAdapter.ts`), **reemplazar el bloque `// TODO` + payload MOCK** del método `sync*` por el `fetch` real usando `this.fetchWithRetry(...)`. El resto del pipeline (raw payload → `normalizeRawData` → upsert idempotente) no cambia.
3. **Ajustar `normalizeRawData` / `mapProvider*`** según el formato real (la checklist documenta el mapping campo a campo).
4. **Capturar una respuesta real anonimizada** y guardarla en `tests/fixtures/analytics/<provider>/<reporte>.json` (sin PII). El test `tests/analytics-fixtures.test.ts` la validará automáticamente.
5. **Disparar un sync manual** desde la UI o `POST /api/analytics/integrations/:id/sync` y revisar `SyncJob` + la pestaña Auditoría.

> Mientras un reporte siga en mock, devuelve `recordsInserted: 0` o un payload de muestra: los dashboards siguen funcionando con lo que haya en `NormalizedConversation`.

---

## 5. Flujo de prueba manual (staging)

1. Login → la barra lateral muestra **Resultados** (`/dashboard/analisis-resultados`).
2. **Configuración** (`/configuracion`): crear integración Cari AI y/o Botmaker → pegar credenciales → **Probar conexión** → **Sync manual**.
3. **Resumen**: KPIs (contención real, CSAT, FRT, ROI), evolución diaria, comparación Cari vs Botmaker.
4. Recorrer pestañas: Operación, Conversaciones (PII enmascarada), Agentes, Campañas, Servicios, Funnels, Calidad del Bot, ROI, Calidad de Datos, Auditoría.
5. **Reglas** (`/reglas`): crear una regla de outcome (p. ej. `csat <= 2 → not_resolved + requiresReview`), verificar que aplica y que se puede eliminar.
6. **Exportar CSV** desde Filtros Globales → confirmar descarga y nueva entrada en **Auditoría**.
7. Verificar **bot-only ≠ resuelto**: en Resumen, `bot-only` y `resolución por bot` muestran valores distintos.

---

## 6. Seguridad (checklist rápida pre-staging)

- [ ] `ANALYTICS_PII_SALT` configurada (sin warning en logs).
- [ ] Credenciales de proveedor solo en `Integration.credentials` (cifradas), nunca en `.env` ni en el front.
- [ ] `npm run test` incluye `no-secrets.test.ts` en verde (sin secretos embebidos).
- [ ] Escrituras (reglas, targets, sync, export) restringidas a OWNER/ADMIN (RBAC verificado en las rutas).
- [ ] Multi-tenant: toda consulta pasa por `buildConversationWhere(workspaceId, …)`.

---

## 7. Rollback

Los cambios de esquema son **aditivos** (columnas/tablas nuevas, sin borrar datos). Para revertir el módulo basta con ocultar el item de navegación "Resultados" y/o desactivar las integraciones (`paused`); los datos normalizados pueden conservarse o purgarse por workspace con `prisma.normalizedConversation.deleteMany({ where: { workspaceId } })`.
