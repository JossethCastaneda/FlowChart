# Checklist de integración real — Botmaker

Estado: **mock** (endpoints reales sin confirmar). Adaptador: `lib/analytics/adapters/BotmakerAnalyticsAdapter.ts`.
Auth actual asumido: `api_key` (`credentials.accessToken`). Soporta **API (pull)** y **webhooks (push)**.

Por cada reporte: confirmar con Botmaker y rellenar. Marcar ☑ cuando quede integrado y con fixture real anonimizado en `tests/fixtures/analytics/botmaker/`.

| Campo a confirmar | Cómo registrarlo |
|---|---|
| Método HTTP | GET/POST |
| URL / base_url | endpoint exacto (incluir `bot_id` si aplica) |
| Headers | `access-token` / `Authorization`, `Content-Type` |
| Parámetros de fecha | nombre del campo + formato |
| Paginación | cursor / page+size / max pages |
| Formato de respuesta | JSON (confirmar esquema) |
| Códigos de error | 401/403/429/5xx + cuerpo |
| Rate limit | req/min |

---

## ReportesConversaciones (chats) → `NormalizedConversation` (mapping ya implementado)

- [ ] Método/URL/headers/fechas/paginación/formato/errores: `____`

**Mapping (Botmaker → normalizado)** — alinear `normalizeRawData(_, "conversations")`:

| Botmaker (mock actual) | Normalizado | Notas |
|---|---|---|
| `chatId` | `providerConversationId` | clave de upsert idempotente |
| `channel` | `channel` | vía `mapProviderChannel` |
| `status` | `status` | vía `mapProviderStatus` |
| `assignedTo` | `agentId` / `wasBotOnly` / `wasHandoff` | sin asignado ⇒ bot-only |
| `tags` | `tags` + `outcome` | **REGLA CRÍTICA:** bot-only sin tag de éxito ⇒ `unclassified`; con tag de éxito (`Resuelto_por_Bot`, `venta_exitosa`, `pagado`, …) ⇒ `resolved` |
| `creationTime` / `lastMessageTime` | `conversationStartedAt` / `conversationEndedAt` | |
| `messagesCount` | `totalUserMessages` | confirmar si separa user/bot/agent |
| `csat` | `csatScore` | |
| (confirmar) | `queueName`, `firstResponseTimeSeconds`, `handleTimeSeconds`, `campaignId`, `serviceId` | |

## ReportesMensajes → `NormalizedMessage` (mapping ya implementado)
- [ ] Método/URL/…: `____`
- [ ] Mapping: `id`→`providerMessageId`, `chatId`→`conversationId`, `from`→`senderType` (user/agent/bot), `type`→`messageType`, `intent`→`intent`, `isFallback`→`isFallback` (clave para fallback rate y calidad del bot), `date`→`sentAt`. Confirmar `status` (sent/delivered/read/replied) y `confidence`.

## ReportesAgentes → `agentId/agentName` (alimenta `aggregateAgents`)
- [ ] Método/URL/…: `____`  · Mapping de estados/tiempos (conectado, pausa, ASA).

## ReportesCampanas → `campaignId` (alimenta `aggregateCampaigns`)
- [ ] Método/URL/…: `____`
- [ ] Mapping: HSM/template, enviadas/entregadas/leídas/respondidas. Hoy las tasas se derivan de conversaciones; entrega/lectura requieren este reporte.

## ReportesFunnels → pasos de funnel
- [ ] Método/URL/…: `____`
- [ ] Mapping de pasos/eventos a un modelo de funnel configurable (TODO pendiente: editor de pasos por tenant).

---

## Webhooks (push, tiempo real) → `processWebhookEvent`
- [ ] URL de webhook expuesta: `/api/.../botmaker/webhook` (definir ruta)
- [ ] **Verificación de firma** con `WHATSAPP_APP_SECRET`/secret de webhook **antes** de confiar en el payload.
- [ ] Resolver `workspaceId` desde la config de la integración (no del payload).
- [ ] **Deduplicación** por `external id` (evento duplicado / fuera de orden) → upsert idempotente.
- [ ] Mapear `action` → upsert a `NormalizedConversation`/`NormalizedMessage`.

---

## Pasos para activar (por reporte)
1. Reemplazar el bloque `// TODO` + mock del método `sync*` por `this.fetchWithRetry(url, { headers })`.
2. Ajustar `normalizeRawData` / `mapProvider*` al formato real (preservando la regla bot-only ≠ resuelto).
3. Guardar fixture real **anonimizado** en `tests/fixtures/analytics/botmaker/<reporte>.json`.
4. `npm run test` (el test de fixtures valida la normalización).
5. Sync manual + revisar `SyncJob` y pestaña Auditoría.
