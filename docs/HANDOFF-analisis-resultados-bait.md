# HANDOFF — Análisis de Resultados + metodología BAIT (NO TOCAR sin leer esto)

> Rama: `claude/epic-kowalevski-84a1eb`. Autor del cambio: Claude (Opus 4.8), 2026-06-17.
> Este documento describe TODO lo implementado para que otra IA/dev **no rompa ni
> duplique** estas implementaciones. Si vas a tocar algo de aquí, lee primero la
> sección "INVARIANTES — no romper".

---

## 0. Resumen en una línea

"Análisis de Resultados" pasó de 3 superficies solapadas a **un solo tab dentro de
cada proyecto** (Botmaker/Cari, una plataforma por proyecto), con un sub-tab
**"Comportamiento del Bot"** que implementa la metodología BAIT (portabilidad)
en vivo desde las conversaciones de Botmaker + cruce con sábana de ventas.

---

## 1. Commits (en orden, todos en esta rama)

| Commit | Qué hace |
|---|---|
| `b3e3c42` | Consolidación base: tab único, gating de canales, `AnalyticsSavedView`, endpoint bot-behavior, TabBotBehavior, vistas guardadas, KPIs editables, funnel builder, export Excel |
| `72b587a` | **Fix 504**: `maxDuration=300` en sync y bot-behavior de proyecto |
| `87a73c0` | Autollenado de canales del bot desde Botmaker (`/channels`) en el formulario |
| `4080713` | Metodología BAIT: venta="felicidades", Funnel 1, NIP, patrones telco |
| `a345a30` | Rechazos (2 frases), SIM/eSIM, reactivaciones |
| `a135098` | Funnel 2 por tipo de bot (`Project.botFlowType` + `FLOW_ORDERS`) |
| `85f62de` | Cruce con sábana de ventas (éxitos/rechazos) |
| `0956283` | Resumen ejecutivo + hallazgos accionables |

---

## 2. Archivos NUEVOS (no los borres ni los re-implementes)

- `app/api/projects/[id]/analytics/bot-behavior/route.ts` — **endpoint EN VIVO** (Botmaker `/sessions`, Cari agregado). Devuelve `BotBehavior` (todas las métricas BAIT). `maxDuration=300`. NO migrar a modelo normalizado: a propósito es live para no depender de `projectId` ni del sync.
- `app/api/projects/[id]/analytics/sales-reconciliation/route.ts` — **cruce con sábana** (multipart CSV/XLSX). Autodetecta columna de teléfono (y bot/capturista). `ventas exitosas = ventas dashboard en sábana`; `primer rechazo = dashboard − exitosas`. `maxDuration=300`.
- `app/api/projects/[id]/analytics/kpi-targets/route.ts` — **forwarder GET** (forwardScoped) para metas KPI por proyecto. La escritura (POST) va al endpoint GLOBAL con `projectId` en el body (forwardScoped NO preserva el body).
- `app/api/projects/[id]/analytics/saved-views/route.ts` — **forwarder GET** de vistas guardadas. Escritura igual: global con projectId.
- `app/api/analytics/saved-views/route.ts` — CRUD global de `AnalyticsSavedView` (GET/POST/DELETE).
- `app/api/integrations/botmaker/channels/route.ts` — lista canales reales de Botmaker para autollenar el formulario.
- `components/analytics-v2/tabs/TabBotBehavior.tsx` — **el tab "Comportamiento del Bot"** (UI completa BAIT: resumen ejecutivo, Funnel 1, tipos de mensaje, botones, errores, NIP, Funnel 2, rechazos, SIM/eSIM, reactivaciones, cruce con sábana, hallazgos).
- `tests/botmaker-behavior.test.ts` — 17 tests de las funciones puras BAIT. **Mantenlos verdes** si tocas `lib/botmaker.ts`.

## 3. Archivos MODIFICADOS (cuidado al editar)

- `lib/botmaker.ts` — **núcleo BAIT**. +683 líneas. Ver sección 6 (exports). NO cambies la regla de venta ni los `FLOW_ORDERS` sin avisar.
- `lib/analytics/project-scope.ts` — `PROVIDER_CHANNELS` + `collectProjectChannels(p, provider?)` (gating de canales por plataforma).
- `lib/analytics/project-scope.server.ts` — resuelve proveedor primero y pasa a `collectProjectChannels`; `resolveProjectProviders` es defensivo ante campos undefined.
- `app/api/projects/[id]/analytics/sync/route.ts` — **estampa `projectId`** en filas normalizadas tras sync (updateMany con `projectId: null`). `maxDuration=300`.
- `app/api/projects/route.ts` y `app/api/projects/[id]/route.ts` — Zod `crmIntegrationIds.max(1)` (una plataforma) + `botFlowType`.
- `prisma/schema.prisma` — `Project.botFlowType String?` + modelo `AnalyticsSavedView`. **Aditivos** (se aplican en deploy vía `prisma db push`).
- `components/analytics-v2/AdvancedAnalyticsDashboard.tsx` — auto-resuelve scope (fetch `configured-channels`), tab "Comportamiento del Bot", botón Excel, vistas guardadas.
- `components/analytics-v2/tabs/TabConfig.tsx` — KPIs editables + fix del botón de sync (apunta a `${base}/sync`).
- `components/analytics-v2/tabs/DataTabs.tsx` — `TabFunnels` con selector + `FunnelBuilder`.
- `app/dashboard/proyectos/[id]/page.tsx` — el tab `resultados` ahora renderiza `<AdvancedAnalyticsDashboard projectId=… />` (antes `ResultsAnalytics`); se quitó el botón secundario.
- `app/dashboard/proyectos/page.tsx` — formulario "Nuevo Proyecto": selector "Tipo de flujo (bot)", IG/FB manual (Botmaker), autollenado de canales, `botFlowType`.
- `components/layout/ClientMainWrapper.tsx` — **se quitó** la entrada "Resultados" del menú lateral.
- `app/dashboard/analisis-resultados/page.tsx` y `app/dashboard/proyectos/[id]/analisis-resultados/page.tsx` — ahora son **redirects** (las superficies viejas se replegaron al tab).
- `app/api/analytics/export/route.ts` — soporta `format=xlsx` (exceljs).
- `tests/analytics-project-scope.test.ts` — tests del gating de canales por proveedor.

---

## 4. INVARIANTES — no romper (esto rompe el producto si se toca)

1. **Una plataforma por proyecto.** Zod `crmIntegrationIds.max(1)` en ambos routes. El gating de canales asume 1 proveedor.
2. **Canales por proveedor.** `PROVIDER_CHANNELS` (`lib/analytics/project-scope.ts`): Botmaker = `whatsapp, webchat, instagram, facebook, messenger`; Cari = `whatsapp, webchat`. NO volver a derivar canales sin mirar el proveedor (un proyecto Cari con IG/FB en sus arrays NO debe mostrar IG/FB).
3. **Estampado de `projectId` en el sync de proyecto.** Sin el `updateMany` de `sync/route.ts`, los tabs normalizados (Resumen/Operación) salen vacíos porque `query.ts` filtra por `where.projectId`. ⚠️ OJO: otra rama del equipo (`feature/vercel-workflow-scheduler`, commit cb8d40fc) QUITÓ ese filtro y scopó por provider+canal. **Si se mergea esa rama, hay conflicto de diseño** — decidir una sola estrategia (estampar projectId vs scope por provider/canal). Documentado en `lib/analytics/query.ts`.
4. **`maxDuration=300`** en los endpoints LIVE (`sync`, `bot-behavior`, `sales-reconciliation`). Bajarlo a 60 causa 504 "Vercel Runtime Timeout" con Cari (descarga reportes paginados). NO bajar.
5. **Venta = mensaje del bot con "felicidades"** (`SALE_PHRASE = /felicidad/i` en `lib/botmaker.ts`). NO volver a detección por tipificación de cierre.
6. **bot-behavior es LIVE, no normalizado.** A propósito. No lo migres al modelo normalizado (perdería el detalle a nivel mensaje: botones, tipos, NIP, funnel de orden).
7. **forwardScoped NO preserva el body.** Por eso los forwarders nuevos (kpi-targets, saved-views) solo hacen GET; las escrituras van al endpoint GLOBAL con `projectId` explícito en el body. No "arregles" esto reusando forwardScoped para POST.
8. **El tab del proyecto NO debe volver al menú lateral.** "Análisis de Resultados" vive dentro del proyecto; el menú lateral se limpió a propósito.

---

## 5. Cambios de schema (Prisma) — aditivos, ya en producción vía db push

```prisma
model Project {
  // ...
  botFlowType  String?   // prepago | pospago_alineado | pospago_simplificado | google_bait | null(auto)
}

model AnalyticsSavedView {
  id String @id @default(cuid())
  workspaceId String
  projectId   String?
  userId      String?   // null = vista compartida del workspace
  name        String
  filters     Json
  createdAt   DateTime @default(now())
  @@index([workspaceId, projectId])
}
```
`scripts/db-sync.mjs` corre `prisma db push` (solo aditivo, nunca `--accept-data-loss`) en cada build.

---

## 6. Exports de `lib/botmaker.ts` (no los dupliques)

Tipos/funciones puras (testeadas en `tests/botmaker-behavior.test.ts`):
- Venta: `isSaleSession`, `computeTimeToSale` (regla felicidades, con `conversionRate`).
- Mensajes/botones: `canonicalMessageType`, `computeMessageTypeBreakdown`, `computeButtonStats`.
- Errores: `computeBotErrors`. Objeciones: vienen de `computeResultsMetrics().topTypifications`.
- NIP: `computeNipTiming` (prompt → primera entrega válida numérica).
- Funnel 1: `computeFirstMenuReaction` (botón/texto/media/sin respuesta).
- Funnel 2: `computeDataRequestOrderFunnel` (auto, FIELD_PATTERNS telco) y `computeFlowFunnel(order)` + `FLOW_ORDERS` (orden fijo por tipo de bot).
- Rechazos: `computeRejectionReasons` (las 2 frases). SIM/eSIM: `computeSimEsim`. Reactivaciones: `computeReactivations`.
- Cruce sábana: `normalizePhone` (últimos 10 dígitos), `saleSessionPhones`.
- Canales: `listBotmakerChannels`, `BmChannelInfo`.
- Agregador: `computeBotBehavior(sessions, channelId?, flowType?)` → `BotBehavior` (lo consume el endpoint y la UI).

`FLOW_ORDERS` (orden Funnel 2 por bot):
- `prepago`: número → NIP → nombre
- `pospago_alineado`: número → nombre → NIP → vigencia → estado_nac → fecha_nac → correo
- `pospago_simplificado`: número → nombre → NIP → estado_nac → fecha_nac → correo
- `google_bait`: **no definido (auto)** — depende de fecha de corte alineado/simplificado. PENDIENTE de regla del negocio.

---

## 7. Mapeo metodología BAIT → dónde vive cada sección

1. Resumen ejecutivo / 11. Hallazgos → `ExecutiveSummary`/`buildFindings` en `TabBotBehavior.tsx`.
2. Global → KPIs del endpoint bot-behavior. 3. Funnel 1 → `computeFirstMenuReaction`.
4. Funnel 2 (global+por bot) → `computeDataRequestOrderFunnel`/`computeFlowFunnel` + `botFlowType`.
5–6. NIP → `computeNipTiming`. 7. SIM/eSIM → `computeSimEsim`. 8. Ventas/reactivaciones → `computeTimeToSale`/`computeReactivations`.
9–10. Cruce sábana / rechazos → `sales-reconciliation/route.ts` + `computeRejectionReasons` + `SalesReconciliation` UI.

Regla de fuente (respetada): ventas dashboard = Botmaker (felicidades); exitosas = cruce con sábana; primer rechazo = resta. NO mezclar universos ni repartir los 2 motivos.

---

## 8. Código viejo DESCONECTADO (no re-cablear)

Estos siguen en el repo pero ya NO los usa el tab nuevo (se dejaron como referencia):
`components/proyectos/ResultsAnalytics.tsx`, `components/analytics-v2/ConversationalDashboard.tsx`,
`app/api/projects/[id]/results/route.ts`, `app/api/botmaker/analytics/route.ts`.
Si vas a borrarlos, confirma antes que nadie más los importe.

---

## 9. Pendientes (requieren al usuario, no código)

- **Regla de Google Bait**: fecha de corte alineado vs simplificado → fijar en `FLOW_ORDERS`/`computeBotBehavior`.
- **Formato de la sábana**: validar autodetección de columnas con un archivo real.
- **Datos reales**: las integraciones Botmaker/Cari ya están en `mode:"real"`; filas normalizadas viejas tienen `projectId=null` → re-sincronizar desde Configuración para poblar tabs normalizados (el tab "Comportamiento del Bot" NO lo necesita, es live).

---

## 10. Verificación

- `npm run typecheck` → limpio.
- `npx vitest run` → **249 tests** en verde (incluye `tests/botmaker-behavior.test.ts` y `tests/analytics-project-scope.test.ts`).
- Lint: los errores `no-explicit-any` que marca el linter en `app/dashboard/proyectos/page.tsx` y el `toMs` de `lib/botmaker.ts` son **preexistentes**, no de este trabajo.
