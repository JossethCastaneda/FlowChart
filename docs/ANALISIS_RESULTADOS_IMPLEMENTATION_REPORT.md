# Análisis de Resultados — Reporte de Implementación

**Fecha:** 2026-06-12
**Stack:** Next.js 16 (App Router) · React 19 · Prisma 7 (PostgreSQL, `@prisma/adapter-pg`) · next-auth 4 · recharts · zod 4 · vitest 3 · Tailwind 4
**Multi-tenancy:** por `workspaceId` (helpers `withAuth`/`withWorkspace`, `getActiveWorkspaceId`). RBAC por `AreaPermissions.canAccessAnalytics` + rol de workspace (OWNER/ADMIN) para escrituras.

> Nota de alcance: el repo modela el tenant como **workspace**. Donde la especificación dice `tenant_id`, aquí se usa `workspaceId` de forma consistente.

---

## 1. Qué se implementó

### Arquitectura por adaptadores (spec §4)
Pipeline desacoplado del proveedor: `Provider → Adapter → RawProviderEvent → normalizeRawData → Outcome Rules → KPI Engine → Aggregations → API → Dashboards`.

- **`AnalyticsProviderAdapter`** (interfaz tipada, sin `any`): `getProviderMetadata`, `testConnection`, `validateCredentials`, `getAvailableReports`, `sync{Conversations,Messages,Agents,Services,Campaigns,Clients,Funnels,CustomReports}`, `processWebhookEvent`, `normalizeRawData`, y mapeos `mapProvider{Channel,Status,Outcome,Tags}`.
- **`CariAiAnalyticsAdapter`** y **`BotmakerAnalyticsAdapter`**: implementaciones con **payloads mock realistas** y **TODOs explícitos** donde el endpoint real no está confirmado. Upserts idempotentes (por `providerConversationId` / `providerMessageId`) y guardado de raw payload.
- **`AnalyticsAdapterFactory`**: resuelve el adaptador por `provider`.

### Regla crítica: bot-only ≠ resuelto por bot (spec §2, §3)
- `normalizeRawData` **no** marca `resolved` solo por ser bot-only. En Botmaker, `resolved` exige **señal explícita de éxito** (tag tipo `Resuelto_por_Bot`, `venta_exitosa`, `pagado`…); sin señal → `unclassified`.
- El motor expone `botOnlyRate` (volumen) y `botResolutionRate` / `realContainmentRate` (éxito) como **métricas separadas**. Cubierto por test.

### Motor de KPIs (spec §13, §14) — `lib/analytics/kpis/engine.ts`
Contención real, bot-only, resolución por bot, escalamiento, fallback rate, task completion, abandono, **abandono temprano**, CSAT, **NPS** (promotores−detractores), FRT/AQT/ASA/AHT, campañas, servicios y **ROI estimado**. Maneja denominador cero sin romper.

### Reglas de outcome configurables (spec §15) — `lib/analytics/kpis/rules.ts`
- Evaluación por **prioridad** (asc), filtrado por `enabled` y `appliesToProvider`.
- `applyOutcomeRules` devuelve `{ outcome, resolvedBy, requiresReview, appliedRuleId, appliedRuleName }` (**trazabilidad**: qué regla clasificó).
- Operadores: `eq/neq/gt/lt/gte/lte/contains`. Alias virtuales: `handoff`, `fallback`, `csat`, `integrationError`, `taskCompleted`.

### Agregaciones por dimensión (spec §18–§25) — `lib/analytics/kpis/aggregations.ts`
Funciones puras y testeables: trends diarios, agentes, campañas, servicios, funnel bot→resolución, operación (colas/SLA), y comparación entre proveedores (Cari vs Botmaker).

### Calidad de datos (spec §27) — `lib/analytics/data-quality.ts`
Detecta: sin fecha de inicio, sin ID externo, duplicados, duración negativa, FRT/AHT > duración, cerrada sin outcome, canal no mapeado. Con resumen por tipo/severidad.

### Privacidad / PII (spec §5.2, §36) — `lib/analytics/privacy.ts`
`hashPII` (SHA-256 salado por workspace), `maskPhone`, `maskEmail`, `maskIdentifier`, `redactText`. El listado de conversaciones enmascara PII por defecto.

### Seguridad multi-tenant (spec §36) — `lib/analytics/query.ts`
`buildConversationWhere(workspaceId, filters)` **fija el `workspaceId` del contexto autenticado e ignora cualquier `workspaceId` que venga por query**. Filtros globales (spec §17) y paginación centralizados. Cubierto por test.

### Diccionario de KPIs + semáforos (spec §12, §35) — `lib/analytics/kpis/definitions.ts`
KPIs con fórmula, unidad, dirección y umbrales por defecto; helper `semaphore()`. Sobreescribibles por workspace vía `AnalyticsKpiTarget`.

### Vistas / rutas funcionales (spec §16–§31)
Dashboard unificado con **12 pestañas**: Resumen, Operación, Conversaciones, Agentes, Campañas, Servicios, Funnels, Calidad del Bot, ROI, Calidad de Datos, Auditoría (+ Integraciones y Reglas como páginas dedicadas). Estados loading/empty/error en cada vista.

---

## 2. Archivos creados / modificados

### Modelo de datos
- **MOD** `prisma/schema.prisma`
  - `NormalizedConversation`: + `botName, agentName, queueName, skillName, totalAgentMessages, npsScore, serviceId, tags[], appliedRuleId, requiresReview` + índices `agentId`, `campaignId`.
  - `NormalizedMessage`: + `topic, confidence, isTemplate, templateName, campaignId, status`.
  - `AnalyticsOutcomeRule`: + `description, priority, enabled, actions, appliesToProvider, createdBy, createdAt, updatedAt` + índice por prioridad.
  - **NUEVOS:** `AnalyticsKpiTarget`, `AnalyticsAuditLog`, `AnalyticsDailyMetric`, `DataQualityIssue`.

### lib/analytics
- **MOD** `adapters/AnalyticsProviderAdapter.ts` (interfaz tipada + tipos `NormalizedConversationInput`/`NormalizedMessageInput`)
- **MOD** `adapters/CariAiAnalyticsAdapter.ts`, `adapters/BotmakerAnalyticsAdapter.ts`
- **MOD** `kpis/engine.ts`, `kpis/rules.ts`
- **NEW** `kpis/aggregations.ts`, `kpis/definitions.ts`
- **NEW** `privacy.ts`, `data-quality.ts`, `query.ts`, `audit.ts`, `rbac.ts`

### API (app/api/analytics)
- **NEW** `operations`, `conversations`, `agents`, `campaigns`, `services`, `funnels`, `bot-quality`, `roi`, `data-quality`, `audit-logs`, `export`, `kpi-targets` (route.ts c/u)
- **NEW** `outcome-rules/[id]/route.ts` (PATCH/DELETE), `integrations/[id]/sync/route.ts` (POST)
- **Pre-existentes (sin cambios):** `overview`, `outcome-rules` (GET/POST), `integrations`, `integrations/test`

### UI
- **NEW** `components/analytics-v2/useAnalyticsData.ts`, `components/analytics-v2/tabs/DataTabs.tsx`
- **MOD** `components/analytics-v2/AdvancedAnalyticsDashboard.tsx` (12 pestañas + export real)
- **MOD** `components/layout/ClientMainWrapper.tsx` (item de navegación "Resultados")
- **FIX** `components/analytics/TabIntegraciones.tsx`, `components/analytics/AnalyticsIntegrationModal.tsx` (faltaba `"use client"` — rompía el build)

### Mocks y tests
- **MOD** `scripts/generate-analytics-mocks.ts` (pobla agentes, colas, servicios, campañas, tags, NPS, requiresReview)
- **NEW** `tests/analytics-pipeline.test.ts`
- **Pre-existentes:** `tests/analytics-adapters.test.ts` (ahora **en verde**, ver §6), `tests/analytics-kpis.test.ts`

---

## 3. Decisiones técnicas

1. **Tenant = workspace.** Se reutiliza el `Integration` existente (credenciales AES-256 vía `encryptToken`) en lugar de duplicar tablas.
2. **Cómputo en vivo + agregados opcionales.** Los KPIs se computan desde `NormalizedConversation` (vía engine/aggregations). `AnalyticsDailyMetric` queda lista para precálculo (spec §33) cuando el volumen lo exija.
3. **Funciones puras y testeables.** Toda la lógica de KPIs/reglas/calidad/agregación vive en `lib/` sin acceso a red/BD; las rutas solo hacen el `findMany` scoped y delegan.
4. **Seguridad por construcción.** `workspaceId` se inyecta desde la sesión y nunca desde el query; escrituras (reglas, targets, sync, export) exigen OWNER/ADMIN.
5. **Mocks honestos.** Donde el endpoint del proveedor no está confirmado, el adaptador devuelve mock realista con `TODO` explícito; nunca se inventa un endpoint como real.
6. **Cambios de schema aditivos.** `db-sync.mjs` es no-fatal; `prisma db push` aplica columnas/tablas nuevas sin pérdida de datos.

---

## 4. Configuraciones disponibles

- **Integraciones** (`/dashboard/analisis-resultados/configuracion`): alta/edición, credenciales cifradas, frecuencia, backfill, timezone, pausa. Test de conexión y **sync manual** (`/api/analytics/integrations/:id/sync`).
- **Reglas de outcome** (`/dashboard/analisis-resultados/reglas`): condiciones, outcome, resolvedBy, prioridad, enabled, `requiresReview`.
- **Metas / semáforos de KPI**: `GET/POST /api/analytics/kpi-targets` (umbrales por workspace sobre `KPI_DEFINITIONS`).
- **ROI**: parámetros económicos por query en `/api/analytics/roi` (costo hora agente, AHT humano, costo mensual bot, ingreso incremental, costo por mensaje).
- **Privacidad**: enmascaramiento por defecto + `ANALYTICS_PII_SALT`.

---

## 5. Variables de entorno

| Variable | Uso | Obligatoria |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Conexión Postgres (existente) | Sí (runtime/build con DB) |
| Clave de cifrado de `encryptToken` (existente) | Credenciales de integraciones | Sí |
| `ANALYTICS_PII_SALT` | Sal del hash de PII | Recomendada (hay default de dev) |
| `SKIP_DB_SYNC=1` | Saltar `db push` en build local sin DB | Opcional |

---

## 6. Comandos ejecutados y resultados

| Comando | Resultado |
|---|---|
| `npx prisma generate` | ✅ OK (cliente regenerado con modelos nuevos) |
| `npx tsc --noEmit` (typecheck) | ✅ **0 errores** |
| `npx vitest run` (test) | ✅ **113 tests / 16 archivos en verde** |
| `npx eslint` (archivos nuevos del módulo) | ✅ **limpios** (sin errores ni warnings) |
| `SKIP_DB_SYNC=1 npx next build` | ✅ **Compiled successfully** (118 páginas, 12 rutas nuevas registradas) |

> El build inicialmente fallaba por un bug **preexistente**: `TabIntegraciones.tsx` y `AnalyticsIntegrationModal.tsx` usaban hooks sin la directiva `"use client"` y los renderiza una página server-component. Se corrigió agregando `"use client"` a ambos (estaban rotos para el build).

### Tests destacados (`tests/analytics-pipeline.test.ts`)
- Normalización Cari AI/Botmaker (mapeos canónicos).
- **bot-only sin señal NO se marca resuelto** (regla crítica).
- **Aislamiento multi-tenant**: `buildConversationWhere` ignora `workspaceId` del query.
- Reglas de outcome: prioridad, `enabled`, `appliesToProvider`, `requiresReview`.
- **bot-only vs resolución como métricas separadas**, NPS, abandono temprano, denominador cero.
- Calidad de datos (fechas/duplicados/duración/cierre sin outcome).
- Privacidad (hash determinístico y salado, máscaras).
- Agregaciones (agentes/campañas/servicios/funnel/operación).

> Los 2 tests que estaban **rotos** en `analytics-adapters.test.ts` (mensajes de error desalineados) se corrigieron alineando el adaptador al contrato del test ("El token de Cari AI es requerido" / "Credenciales inválidas para Cari AI").

### Estado de lint (baseline del repo)
`npm run lint` reporta **1338 problemas (951 errores, 387 warnings) preexistentes** en todo el repo, **ninguno** en los archivos nuevos de este módulo (verificado: los archivos de `lib/analytics`, las rutas nuevas y los componentes nuevos no aparecen en la salida de lint). Las reglas que dominan el baseline son `@typescript-eslint/no-explicit-any` y `react-hooks/*` (p. ej. `set-state-in-effect`), presentes en rutas antiguas (`app/api/analytics/{audience,growth,posts,reels,stories,organic,best-time,overview}`) y en `components/analytics-v2/tabs/{TabOperation,TabQuality,TabRoi}.tsx`. No se reescribieron por la instrucción de no tocar lo ya implementado que no esté roto.

---

## 7. Cómo probar manualmente

1. **Generar datos mock** (requiere `DATABASE_URL` y al menos un workspace):
   ```bash
   npx tsx scripts/generate-analytics-mocks.ts
   ```
   Genera 1.000 conversaciones + mensajes con agentes, colas, servicios, campañas, tags, CSAT/NPS y casos resueltos/abandonados/transferidos.
2. **Abrir el módulo:** `/dashboard/analisis-resultados` (nav "Resultados"). Recorrer las 12 pestañas y los filtros globales (rango, plataforma, canal, outcome).
3. **Integraciones:** `/dashboard/analisis-resultados/configuracion` → crear integración Cari AI/Botmaker → "Probar conexión" → "Sync manual".
4. **Reglas:** `/dashboard/analisis-resultados/reglas` → crear/editar/eliminar reglas.
5. **Export:** botón "Exportar CSV" (genera audit log) → revisar pestaña Auditoría.

---

## 8. TODOs pendientes

- **Endpoints reales de proveedor** (marcados `TODO` en los adaptadores): método/URL/headers, parámetros de fecha, paginación, formato de respuesta y códigos de error de Cari AI y Botmaker; firma del webhook de Botmaker.
- **Sync programado**: existe la estructura (`SyncJob`, sync manual). Falta el cron (Vercel Cron) que itere integraciones activas.
- **Agregados diarios**: poblar `AnalyticsDailyMetric` para datasets grandes (hoy se computa en vivo).
- **Alertas** (`AnalyticsAlert`): definidas en spec §30; pendiente motor de evaluación + persistencia.
- **Funnels configurables por pasos** (spec §24): hoy funnel canónico bot→resolución; falta editor de pasos/eventos por tenant.
- **`view_sensitive`**: el permiso granular de PII está documentado; hoy se enmascara siempre (default seguro).
- **Lint legacy**: limpiar `any`/`react-hooks` en rutas y tabs antiguos cuando se aborden esos módulos.

---

## 9. Criterios de aceptación (spec §39) — estado

✅ Navegación del módulo · ✅ Resumen · ✅ Operación · ✅ Conversaciones/Agentes/Campañas/Servicios/Funnels/Calidad bot/ROI/Integraciones/Calidad de datos/Auditoría · ✅ Modelo normalizado · ✅ Adaptadores Cari AI + Botmaker · ✅ Interfaz `AnalyticsProviderAdapter` · ✅ Config segura de integraciones · ✅ Sin credenciales en texto plano · ✅ testConnection · ✅ Sync manual · ✅ Estructura para sync programado · ✅ Raw payloads · ✅ Normalización · ✅ Reglas de outcome configurables · ✅ **bot-only y resuelto-por-bot separados** · ✅ KPIs obligatorios · ✅ Estructura de agregados diarios · ✅ Filtros globales · ✅ Exportaciones · ⏳ Alertas (estructura/TODO) · ✅ Audit logs · ✅ Validaciones de calidad de datos · ✅ Datos mock · ✅ Tests de KPIs/outcome/multi-tenant/normalización · ✅ Manejo de errores · ✅ Estados loading/empty/error · ✅ Multi-tenant · ✅ typecheck/test en verde + lint/build documentados.

---

## 10. Preparación para staging (integración real progresiva)

Documentos de soporte añadidos:
- **`docs/ANALISIS_RESULTADOS_STAGING_RUNBOOK.md`** — variables de entorno, setup, seed de mocks, comandos de verificación, flujo de prueba manual, seguridad y rollback.
- **`docs/integrations/CARI_AI_INTEGRATION_CHECKLIST.md`** y **`docs/integrations/BOTMAKER_INTEGRATION_CHECKLIST.md`** — por reporte: endpoint, método, headers, parámetros, paginación, formato, errores y **mapping campo→modelo normalizado**.

### 10.1 Reconciliación de rutas API (implementadas vs registradas)
`Glob app/api/analytics/**/route.ts` = **25 archivos**. Salida de `next build` = **25 rutas registradas**. Coincidencia **1:1, sin rutas huérfanas ni faltantes**; las dinámicas `outcome-rules/[id]` e `integrations/[id]/sync` están registradas correctamente. (El conteo de "12" en un reporte previo era un patrón de grep incompleto, no una discrepancia real.)

### 10.2 Auditoría de secretos
- `tests/no-secrets.test.ts` en verde (escáner anti-credenciales de todo el repo).
- Grep dirigido al módulo (`lib/analytics`, `app/api/analytics`, mocks): **sin tokens, API keys, passwords ni PII real** (los mocks usan `cust_N`, sin nombres/emails/teléfonos reales).
- **Sal de PII endurecida**: el fallback se renombró a `sodare-analytics-dev-only-not-a-secret` (placeholder público explícito) y se agregó un `console.warn` cuando falta `ANALYTICS_PII_SALT` en producción. Las credenciales de proveedor viven cifradas (AES-256) en `Integration`, nunca en `.env` ni en el front.

### 10.3 Fixtures de respuestas anonimizadas (condición de integración)
Scaffold creado en `tests/fixtures/analytics/{cari-ai,botmaker}/*.json` con payloads **anonimizados** (placeholder, sin PII) que reemplazarán respuestas reales cuando los endpoints se confirmen. `tests/analytics-fixtures.test.ts` (3 tests) normaliza esos fixtures y valida el contrato — incluida la **regla bot-only ≠ resuelto** (Botmaker sin tag de éxito ⇒ `unclassified`; con `Resuelto_por_Bot` ⇒ `resolved`).

### 10.4 Arquitectura por adaptadores intacta
La UI sigue consumiendo solo la API interna normalizada (sin campos propietarios). Migrar a real es reemplazar el bloque `// TODO`+mock de cada `sync*` por `fetchWithRetry` y ajustar `normalizeRawData`/`mapProvider*`; el resto del pipeline (raw → normalize → upsert idempotente → KPIs → dashboards) no cambia.

### 10.5 Verificación (staging)
| Comando | Resultado |
|---|---|
| `tsc --noEmit` | ✅ **0 errores** |
| `vitest run` | ✅ **116 tests / 17 archivos** (incluye fixtures + anti-secretos) |
| `SKIP_DB_SYNC=1 next build` | ✅ **Compiled successfully** (exit 0) |

**Archivos añadidos en esta fase:** `docs/ANALISIS_RESULTADOS_STAGING_RUNBOOK.md`, `docs/integrations/CARI_AI_INTEGRATION_CHECKLIST.md`, `docs/integrations/BOTMAKER_INTEGRATION_CHECKLIST.md`, `tests/analytics-fixtures.test.ts`, `tests/fixtures/analytics/cari-ai/conversations.json`, `tests/fixtures/analytics/botmaker/{conversations,messages}.json`. **Modificado:** `lib/analytics/privacy.ts` (endurecimiento de sal).

---

## 11. Security QA aprobado (auditoría estricta)

Auditoría de seguridad, privacidad y multi-tenancy del módulo. **Resultado: APROBADO.** Evidencia por punto:

| # | Verificación | Estado | Evidencia |
|---|---|---|---|
| 1 | Ningún endpoint consulta datos de otro workspace | ✅ | Todas las rutas usan `withWorkspace` (workspaceId de sesión) + `buildConversationWhere(workspaceId, …)`; `audit-logs`/`kpi-targets` filtran `where:{workspaceId}`; `bot-quality` filtra mensajes por `workspaceId`. |
| 2 | `buildConversationWhere` ignora workspaceId del query | ✅ | `parseFilters` no lee `workspaceId`; test `Multi-tenant isolation` pasa `workspaceId=EVIL_TENANT` y el WHERE conserva el real. |
| 3 | Workspace siempre desde contexto autenticado | ✅ | `withWorkspace` → `getActiveWorkspaceId(session.userId)` con membresía verificada. |
| 4 | Sin credenciales/tokens/keys/salts/PII hardcodeados | ✅ | `no-secrets.test.ts` en verde; grep dirigido sin hallazgos; sal de PII = placeholder público + warning en prod; credenciales cifradas en `Integration`. |
| 5 | Exportaciones validan permisos + audit log | ✅ | `export` exige membresía de workspace (mismo gate que ver) y escribe `AnalyticsAuditLog` (`action:"export"`, formato, filas); PII enmascarada en el archivo. |
| 6 | `conversations.view_sensitive` para datos sensibles | ✅ (por defecto seguro) | La API **nunca** expone PII en claro: `conversations` y `export` usan `maskIdentifier`/`hashPII`. Ver datos sin enmascarar no está habilitado (requeriría el permiso explícito); documentado como gate futuro. |
| 7 | Hashes usan `ANALYTICS_PII_SALT` | ✅ | `hashPII` = SHA-256 con `ANALYTICS_PII_SALT` (+ workspaceId donde aplica); en prod sin la env var hay warning. |
| 8 | Raw payloads no expuestos en UI sin admin | ✅ | Ninguna ruta retorna `RawProviderEvent`; los dashboards consultan solo el modelo normalizado. |
| 9 | Logs sin credenciales ni payloads sensibles | ✅ | Grep de `console.*` en `lib/analytics`: solo mensajes de error y `action` de webhook; nunca token/credencial/payload completo. |
| 10 | Mocks sin datos reales | ✅ | `cust_N`, ids `*-fixture-*`, textos `[anonimizado]`; sin nombres/emails/teléfonos reales. |
| 11 | PATCH/DELETE outcome rules validan ownership | ✅ | `outcome-rules/[id]`: `isWorkspaceAdmin` + `ownRule()` exige `rule.workspaceId === ctx.workspaceId`. |
| 12 | Sync manual valida integración del tenant | ✅ | `integrations/[id]/sync`: `isWorkspaceAdmin` + `integration.workspaceId === ctx.workspaceId`. |
| 13 | Tests relevantes pasan | ✅ | `vitest run` → **118 tests / 17 archivos** en verde. |

Comandos de evidencia: `npx vitest run` (118 ✓), `npx tsc --noEmit` (0 errores), grep `console.*` en `lib/analytics`, `no-secrets.test.ts` ✓.

---

## 12. Integración real Cari AI / Botmaker (modo mock/real configurable)

Se conectaron las APIs **reales ya disponibles en el repo**, sin romper el modo mock. Cada integración elige modo vía `config.mode` (`"mock"` default | `"real"`). La UI sigue consumiendo solo el modelo normalizado.

### 12.1 Tabla de endpoints encontrados (fuente: código del repo)

| Proveedor | Recurso | Método | Endpoint | Headers | Params/Body | Paginación | Respuesta | Errores | Fuente | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| Cari AI | createtoken | POST | `https://cari.ai/reportapiv2/v1/createtoken` | `Content-Type: application/json` | body `{credentials}` | — | `{cariSec}` | HTTP !ok | `lib/crm/cari.ts` | **Implementado** (testConnection real) |
| Cari AI | conversaciones | POST | `…/v1/conversaciones` | `CariSec` | body `{date_from,date_to,page,limit}` | `page`/`limit`(2000), `end_of_registers` | `{payload[]}` | 401→retoken | `lib/crm/cari.ts` | **Parcial**: fetch+raw real; normalización per-fila TODO (falta id) |
| Cari AI | indicadoresAtencion | POST | `…/v1/indicadoresAtencion` | `CariSec` | idem | idem | `payload[]` (agregado diario) | idem | `lib/crm/cari.ts` | Incompleto → TODO mapear a `AnalyticsDailyMetric` |
| Cari AI | frasesSinRespuesta | POST | `…/v1/frasesSinRespuesta` | `CariSec` | idem `+{status:0}` | idem | `payload[]` | idem | `lib/crm/cari.ts` | Incompleto → TODO (calidad del bot) |
| Cari AI | errores | POST | `…/v1/errores` | `CariSec` | idem | idem | `payload[]` | idem | `lib/crm/cari.ts` | Incompleto → TODO |
| Cari AI | Agentes/Clientes/Personalizados | — | no confirmado | — | — | — | — | — | — | Mock + TODO exacto |
| Botmaker | sessions | GET | `https://api.botmaker.com/v2.0/sessions?from&to&include-messages=true&include-events=true` | `access-token`, `Accept/Content-Type: json` | query `from,to,include-*` | cursor `nextPage` (≤6 pág., 500/pág.) | `{items[],nextPage}` | 429 backoff; 401/403 inválido | `lib/botmaker.ts` | **Implementado** (testConnection + syncConversations + syncMessages real) |
| Botmaker | agents/campaigns/funnels/tags/variables/templates | — | no confirmado | — | — | — | — | — | — | Mock + TODO exacto |
| Botmaker | webhook | — | esquema/firma no confirmados | — | — | — | — | — | — | Stub + TODO (verificación de firma) |

### 12.2 Campos mapeados (modo real)

**Botmaker `/sessions` → `NormalizedConversation`** (`mapSession`):
`id`→`providerConversationId` · `creationTime`→`conversationStartedAt` · evento `conversation-close`/último msg→`conversationEndedAt`/`closedAt` · `chat.chat.channelId`→`channel` (canónico; fallback `whatsapp`, TODO mapa de canales) · `chat.chat.contactId`→`customerIdentifierHash` (hashPII, **nunca en claro**) · conteo por `from`→`totalUser/Bot/AgentMessages`, `wasBotOnly`/`wasHandoff` · `conversation-close.info.typification`→`outcome`/`resolvedBy` (**éxito→resolved; abandon→abandoned; no_resp→not_resolved; agente sin tipificación→transferred; bot-only sin cierre→unclassified**) · 1ª resp bot→`firstResponseTimeSeconds` · 1er agente→cierre→`handleTimeSeconds` · inicio→cierre→`durationSeconds`.
**Botmaker mensajes** (de `/sessions`): `${sessionId}::${i}`→`providerMessageId` (idempotente) · `from`→`senderType` · `content.type`→`messageType` · `creationTime`→`sentAt`. *(intent/isFallback no vienen en `/sessions` → TODO endpoint NLU.)*

**Cari AI `conversaciones`**: raw capturado en `RawProviderEvent`; normalización per-fila pendiente del campo id confirmado (TODO).

### 12.3 Errores, retries, timeout, rate limit, paginación
- **Botmaker**: `botmakerFetch` aplica backoff en 429 (2 reintentos); `testConnection` real distingue 401/403 (credenciales) de otros HTTP; `listSessions` pagina por `nextPage` con tope de 6 páginas; corta en `!ok`.
- **Cari**: `fetchCariReport` re-tokeniza en 401 y reintenta; corta y loguea en `!ok`; pagina por `page`/`limit` hasta `end_of_registers` o `MAX_PAGES`; `createtoken` lanza en `!ok`.
- Regla crítica preservada en ambos: **bot-only ≠ resuelto** (test `analytics-fixtures` con forma real de `/sessions`).

### 12.4 Variables de entorno
`ENCRYPTION_KEY` (cifra credenciales), `ANALYTICS_PII_SALT` (hash PII), `APP_TIMEZONE` (ventanas CDMX), `BOTMAKER_ACCESS_TOKEN`/`BOTMAKER_BASE_URL` (**solo dev**; en prod cada workspace conecta su token cifrado en `Integration`). Credenciales reales por workspace: `Integration` provider `"botmaker"` y `"cari"` (cifradas, AES-256).

### 12.5 Cómo probar en staging
1. Conectar credenciales reales en la UI (Integraciones) — provider `botmaker` y/o `cari`.
2. Poner la integración de analítica en modo real: `config.mode = "real"`.
3. (Opcional) Test real: `POST /api/analytics/integrations/test` con `{provider, credentials, live:true}`.
4. `POST /api/analytics/integrations/:id/sync` → revisar `SyncJob`, `NormalizedConversation` y la pestaña Auditoría.

### 12.6 Cómo volver a modo mock
Poner `config.mode = "mock"` (o dejarlo sin definir — **mock es el default**). El modo mock no hace llamadas de red y siembra payloads de muestra; los dashboards siguen funcionando igual.

### 12.7 Pendientes reales (no inventados)
- Cari: confirmar **campo id/canal** del reporte `conversaciones` para upsert per-fila; mapear `indicadoresAtencion`→`AnalyticsDailyMetric`; ingestión de `frasesSinRespuesta`/`errores`; endpoints de Agentes/Clientes/Personalizados.
- Botmaker: mapa `channelId→plataforma` (GET /channels); `intent`/`isFallback` a nivel mensaje (endpoint NLU); endpoints de agentes/campañas/funnels/tags/variables; **esquema + verificación de firma del webhook**.

### 12.8 Verificación
| Comando | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| `vitest run` | ✅ **118 / 17** (incluye normalización real de `/sessions`, bot-only≠resuelto, idempotencia) |
| `SKIP_DB_SYNC=1 next build` | ✅ Compiled successfully |
| `npm run lint` | 947 errores **preexistentes** del repo; **0 en archivos del módulo** (verificado por grep) |

**Archivos de esta fase** — Nuevos: `lib/analytics/mode.ts`, `tests/fixtures/analytics/botmaker/sessions.json`. Modificados: `lib/analytics/adapters/{CariAi,Botmaker}AnalyticsAdapter.ts` (modo real), `lib/crm/cari.ts` (export `validateCariCredential`), `app/api/analytics/integrations/route.ts` (`config.mode` + tipado de credenciales), `app/api/analytics/integrations/test/route.ts` (`live` + tipado), `tests/analytics-fixtures.test.ts`, `.env.example` (`ANALYTICS_PII_SALT`).

---

## 13. Proyectos → Análisis de Resultados (módulo global acotado por proyecto)

Se reutiliza el módulo global de Análisis de Resultados (`AdvancedAnalyticsDashboard` + pipeline `lib/analytics`) **acotado a un proyecto/cliente** y a los **canales configurados** en ese proyecto. No se duplicó el dashboard ni el motor de KPIs: un único parámetro `projectId` viaja por la misma query a todas las pestañas/rutas y el WHERE se restringe de forma centralizada.

### 13.1 Estrategia de scoping (según el modelo real del repo)
`NormalizedConversation` se aísla por `workspaceId` y **no tiene `projectId`** (el modelo real no lo incluye). El alcance por proyecto se construye con dos dimensiones que sí existen:

1. **Proveedores (bot) configurados** — `Project.crmIntegrationIds` (fallback al legacy `crmIntegrationId`) → `Integration.provider` → proveedor normalizado. Mapa: `botmaker→botmaker`, `cari|cari_ai→cari_ai`. Proveedores sin adaptador analítico se descartan.
2. **Canales configurados** — derivados de las cuentas sociales del proyecto: `whatsapp[]→whatsapp`, `instagram[]→instagram`, `fanpage[]→facebook + messenger`. Solo aparecen los canales realmente configurados; si un canal no está configurado **no es opción en el selector ni contamina KPIs**.

El WHERE aplica **siempre** `provider IN scope.providers` y `channel IN scope.channels` (incluso con lista vacía → 0 filas: un proyecto sin proveedor o sin canales nunca filtra datos de otros proyectos). Un `provider`/`channel` pedido por query solo se respeta si está dentro del alcance; si no, se ignora y se mantiene la restricción del proyecto (defensa contra lectura de canales no configurados).

> **Aislamiento entre proyectos del mismo workspace (limitación real, documentada):** como el modelo normaliza por `workspaceId`, dos proyectos del mismo workspace que usen el **mismo proveedor y los mismos canales** verán el mismo dataset. La atribución por proyecto a nivel fila exigiría agregar `projectId` a `NormalizedConversation` y poblarlo en la ingesta (resolviendo el proyecto desde `MetaSource`/`WaPhoneSource`/canal del evento) + backfill. Queda como pendiente real (ver §13.6). El scoping por proveedor+canal aquí es **más estricto** que el precedente del repo (`/api/projects/[id]/results`, que solo segmenta por proveedor).

### 13.2 Vista
- **NUEVA** ruta `/dashboard/proyectos/[id]/analisis-resultados` (server component): verifica sesión + workspace activo, resuelve el alcance del proyecto **verificando ownership multi-tenant antes de tocar datos**, y:
  - sin proveedor (bot) conectado → empty state con CTA a la configuración del proyecto;
  - sin canales configurados → empty state con CTA para configurar canales;
  - con alcance válido → `AdvancedAnalyticsDashboard` acotado, dentro de `PermissionGuard(canAccessAnalytics)`.
- **MOD** `app/dashboard/proyectos/[id]/page.tsx`: botón "Análisis avanzado" en la barra de pestañas que navega a la ruta nueva.

### 13.3 Bot-only ≠ resuelto, adaptadores y modelo normalizado
Se preservan intactos: la separación bot-only vs resuelto-por-bot, la arquitectura por adaptadores y el modelo normalizado. El dashboard de proyecto consume **las mismas** rutas/KPIs que el global; solo cambia el alcance del WHERE.

### 13.4 Filtros
El dashboard de proyecto ofrece los mismos filtros (rango de fechas, plataforma/proveedor, canal, outcome; y por proveedor/agente/cola/skill/campaña/servicio/tag a través de la query compartida `parseFilters`/`buildConversationWhere`), pero **plataforma y canal solo listan lo configurado en el proyecto**.

### 13.5 Archivos creados / modificados
- **NEW** `lib/analytics/project-scope.ts` — helpers puros (client-safe, sin prisma): `deriveProjectChannels`, `deriveNormalizedProviders`, `INTEGRATION_TO_NORMALIZED_PROVIDER`, `CHANNEL_LABELS`, `PROVIDER_LABELS`, tipo `ProjectScope`.
- **NEW** `lib/analytics/project-scope.server.ts` — `resolveProjectScope`/`resolveProjectScopeView` (verifican `project.workspaceId === ctx.workspaceId`) y `scopeFromRequest` (alcance opcional desde `projectId` del query; 404 si el proyecto no es del workspace).
- **MOD** `lib/analytics/query.ts` — `buildConversationWhere(workspaceId, filters, scope?)` aplica `provider IN`/`channel IN` con intersección de filtros; nuevo helper `applyScopeToMessageWhere` (acota mensajes por proveedor).
- **MOD** rutas API (alcance opcional `projectId`, ownership validado): `overview`, `operations`, `conversations`, `agents`, `campaigns`, `services`, `funnels`, `bot-quality`, `roi`, `data-quality`, `export` (registra `projectId` en el audit log), `audit-logs` (filtra por `resourceId = projectId`).
- **MOD** `components/analytics-v2/AdvancedAnalyticsDashboard.tsx` — props `projectId`/`availableChannels`/`availableProviders`; thread de `projectId` en la query; selectores de plataforma/canal restringidos.
- **NEW** `app/dashboard/proyectos/[id]/analisis-resultados/page.tsx`.
- **MOD** `app/dashboard/proyectos/[id]/page.tsx` — enlace al módulo avanzado.
- **NEW** `tests/analytics-project-scope.test.ts` — 14 tests: derivación de canales/proveedores, scoping por proyecto, intersección de filtros (canal/proveedor fuera de alcance se ignora), proyecto sin canales/proveedor → `IN []`, aislamiento multi-tenant (`workspaceId` del contexto, nunca del query).

### 13.6 Pendientes reales (no inventados)
- `projectId` a nivel fila en `NormalizedConversation` + poblarlo en ingesta (resolución por `MetaSource`/`WaPhoneSource`/canal) + backfill, para aislamiento exacto entre proyectos del mismo workspace y mismo proveedor/canal.
- Mapeo de canal en mensajes: `NormalizedMessage` no tiene `channel`; el scoping de mensajes (bot-quality) es por proveedor. Añadir canal al mensaje permitiría acotar fallback intents por canal.

### 13.7 Verificación
| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errores** |
| `npx vitest run` | ✅ **132 tests / 18 archivos** (incluye `analytics-project-scope` con 14 tests) |
| `SKIP_DB_SYNC=1 npx next build` | ✅ **Compiled successfully** (ruta `/dashboard/proyectos/[id]/analisis-resultados` registrada) |
