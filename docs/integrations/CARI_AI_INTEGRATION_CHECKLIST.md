# Checklist de integración real — Cari AI

Estado: **mock** (endpoints reales sin confirmar). Adaptador: `lib/analytics/adapters/CariAiAnalyticsAdapter.ts`.
Auth actual asumido: `bearer_token` (`credentials.accessToken`). Cada grupo de reportes **puede** tener credencial propia (spec §7).

Por cada reporte: confirmar con Cari AI y rellenar. Marcar ☑ cuando quede integrado y con fixture real anonimizado en `tests/fixtures/analytics/cari-ai/`.

| Campo a confirmar | Cómo registrarlo |
|---|---|
| Método HTTP | GET/POST |
| URL / base_url | endpoint exacto |
| Headers | `Authorization`, `Content-Type`, custom |
| Parámetros de fecha | nombre del campo + formato (ISO 8601 vs epoch) |
| Paginación | cursor / page+offset / page size / max pages |
| Formato de respuesta | JSON / CSV / XLSX (+ delimitador si CSV) |
| Códigos de error | 401/403/429/5xx y cuerpo de error |
| Rate limit | req/min |

---

## ReportesConversaciones  → `NormalizedConversation` (mapping ya implementado)

- [ ] Método: `____`  · URL: `____`
- [ ] Headers: `Authorization: Bearer <token>` · `____`
- [ ] Fechas: `____` (formato `____`)
- [ ] Paginación: `____`
- [ ] Formato: `____`
- [ ] Errores: `____`

**Mapping (Cari AI → normalizado)** — alinear `normalizeRawData(_, "conversations")`:

| Cari AI (mock actual) | Normalizado | Notas |
|---|---|---|
| `id_conversacion` | `providerConversationId` | clave de upsert idempotente |
| `canal` | `channel` | vía `mapProviderChannel` |
| `estado` | `status` | vía `mapProviderStatus` (cerrada→closed…) |
| `atendido_por` | `resolvedBy` / `wasBotOnly` / `outcome` | `bot`→resolved; **bot-only NO implica éxito** salvo señal explícita |
| `fecha_inicio` / `fecha_fin` | `conversationStartedAt` / `conversationEndedAt` | |
| `mensajes_usuario` / `mensajes_bot` | `totalUserMessages` / `totalBotMessages` | |
| `csat` | `csatScore` | |
| `etiquetas` | `tags` | vía `mapProviderTags` |
| (confirmar) | `agentId`, `queueName`, `firstResponseTimeSeconds`, `handleTimeSeconds`, `serviceId`, `campaignId` | hoy no provistos por el mock |

## ReportesAgentes → `NormalizedConversation.agentId/agentName` (alimenta `aggregateAgents`)
- [ ] Método/URL/headers/fechas/paginación/formato/errores: `____`
- [ ] Mapping: `agent_id`→`agentId`, `nombre`→`agentName`, métricas (FRT/AHT/CSAT) → campos de conversación o agregado.

## ReportesServicio → `serviceId` / outcome de servicio (alimenta `aggregateServices`)
- [ ] Método/URL/…: `____`
- [ ] Mapping: `servicio_id`→`serviceId`, `estado_servicio` (completed/failed) → `outcome` (resolved/error) según reglas de outcome.

## ReportesClientes → `customerId` (hash) / recurrencia
- [ ] Método/URL/…: `____`
- [ ] Mapping: identificadores **hasheados** con `hashPII` antes de persistir (`customerIdentifierHash`); nunca PII en claro.

## ReportesPersonalizados → `syncCustomReports`
- [ ] IDs de reportes custom: `____`
- [ ] Parser por formato (JSON/CSV/XLSX), alias de campos, manejo de nulos.

---

## Pasos para activar (por reporte)
1. Reemplazar el bloque `// TODO` + mock del método `sync*` por `this.fetchWithRetry(url, { headers })`.
2. Ajustar `normalizeRawData` / `mapProvider*` al formato real.
3. Guardar fixture real **anonimizado** en `tests/fixtures/analytics/cari-ai/<reporte>.json`.
4. `npm run test` (el test de fixtures valida la normalización).
5. Sync manual + revisar `SyncJob` y pestaña Auditoría.
