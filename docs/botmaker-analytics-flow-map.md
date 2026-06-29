# Botmaker — Mapa de Flujo y Especificación de Métricas (Portabilidad / Cambio de compañía)

> Documento de trabajo. Todos los bots de Botmaker del workspace son de **portabilidad / cambio de
> compañía (telco)**. Este mapa conecta cada métrica/dimensión que el negocio necesita con la **señal
> exacta de la API de Botmaker** y su estado de implementación en el código actual.
>
> **Fuentes:** la doc oficial v2.0 (`https://api.botmaker.com/v2.0/`) es un Swagger renderizado en el
> panel (`go.botmaker.com/#/api`, requiere login) — no es fetcheable públicamente. La fuente
> autoritativa para *esta* integración es el código en uso (`lib/botmaker-api.ts`, `lib/botmaker.ts`,
> `lib/botmaker/insights.ts`) más los artículos del help center y la referencia de Meta CTWA.
> Refs: [Acceso API v2.0](https://help.botmaker.com/es/help/8332500207456214277) ·
> [POST /metrics/v2/download](https://help.botmaker.com/es/help/5682383179073841503) ·
> [Reporte de métricas de agentes](https://help.botmaker.com/en/help/2089908265092354662) ·
> [Click-to-WhatsApp Dashboards](https://help.botmaker.com/en/help/6096263385513851638) ·
> [Sessions](https://help.botmaker.com/en/help/7180475138989593980) ·
> [Meta CTWA / CAPI](https://developers.facebook.com/docs/marketing-api/ad-creative/messaging-ads/click-to-whatsapp/).

---

## 1. Superficie de la API (endpoints)

Autenticación: header `access-token`. Base: `https://api.botmaker.com/v2.0`. Fechas en ISO-8601 con TZ.

| Endpoint | Método | Para qué sirve | En código |
|---|---|---|---|
| `/sessions?from&to&include-messages&include-events&long-term-search&channelId` | GET | **Fuente principal**: sesiones paginadas con mensajes + eventos (timeline completo). Sigue `nextPage`. | ✅ `listSessions` |
| `/channels`, `/channels/:id` | GET | Canales del bot (WhatsApp/IG/FB/webchat) con `id,name,platform,number`. | ✅ `listChannels` |
| `/contacts`, `/contacts/:id` | GET | Contactos: variables y tags acumuladas del usuario. | ✅ `listContacts/getContact` |
| `/contacts` (variables/tags) | POST | Escribe variables/tags del contacto. | ✅ `setContactVariables/Tags` |
| `/chats`, `/chats/:id` | GET | Conversaciones (estado open/closed/pending/snoozed, **operador asignado**). | ✅ `listChats/getChat` |
| `/chats/:id/messages` | GET | Mensajes de un chat (incluye identidad del operador — ver §4.6). | ✅ `getChatMessages` |
| `/chats/:id/close \| /assign \| /snooze` | POST | Cerrar (con tipificación), asignar a agente, posponer. | ✅ |
| `/chats-actions/send-message \| send-image \| send-document \| send-buttons` | POST | Envío saliente. | ✅ |
| `/intent/v2` | POST | Disparar una intención del bot. | ✅ `triggerIntent` |
| `/intents` | GET | Catálogo de intenciones / `botId → nombre del bot`. | ✅ (en `loadMeta`) |
| `/variables` | GET | **Diccionario de variables personalizadas** del bot. | ✅ (en `loadMeta`) |
| `/agents`, `/agents/:id` | GET | **Asesores**: id, nombre, estado (online/offline/busy). | ✅ `listAgents` |
| `/waTemplates`, `/waTemplates/:name` | GET | Plantillas HSM de WhatsApp. | ✅ |
| `/notifications`, `/notifications/:id` | GET/POST/DELETE | Campañas (estado, queued, failed). **No expone entregados/leídos.** | ✅ |
| `/ecommerce/catalogs`, `/products` | GET/CRUD | Catálogos/productos (no se usa en telco). | ✅ |
| `/webhooks` | GET/POST/DELETE | Suscripción a eventos en tiempo real (ver §3). | ✅ |
| **`/metrics/v2/download`** | **POST** | **Métricas agregadas oficiales**: sesiones transferidas, tipificaciones, sesiones abandonadas, NPS. | ❌ **NO wrapeado** — oportunidad |
| `/messages` | — | Endpoint de mensajes (referenciado en doc). | ❌ no usado |
| Reporte de métricas de agentes | (panel) | Desempeño de asesores integrado en Botmaker. | ❌ no consumido |

---

## 2. Modelo de datos de `/sessions` (el timeline)

```ts
BmSession {
  id, creationTime,                       // inicio de la sesión (ISO/ms)
  chat: { chat: { contactId, channelId }, // QUIÉN (contacto único) y POR DÓNDE (canal)
          lastUserMessageDatetime },
  messages: [ { from: "bot"|"user"|"agent",   // ROL del emisor
                creationTime,                  // timestamp del mensaje
                content: { type, text, buttons, selectedButton,
                           media:{type,url,caption}, carouselItems } } ],
  events:  [ { name,                            // nombre del NODO/acción (ver convenciones)
               creationTime,
               info: { typification, error, errorType, reason, messageId,
                       variableName, variableValue,   // set-variable: dato capturado
                       intentId, intentName, isFallback } } ]
}
```

### Convenciones de nombres de eventos (clave para el flujo)
- `fulfilled of "CAMPO"` → el CAMPO se capturó **válido** (respuesta correcta → se guarda en variable).
- `incorrect of "CAMPO"` → el usuario dio una respuesta **inválida** para CAMPO.
- `inactivity of "CAMPO"` → el usuario quedó **inactivo** en CAMPO.
- `set-variable` (`info.variableName/variableValue`) → señal de "el bot pidió y guardó este dato".
- `find-intent` (`info.intentName/isFallback`) → intención disparada; `isFallback=true` = no entendió.
- `"Mensaje por defecto"` (typification/nodo) → fallback (no comprendió).
- Tipificación de cierre: `info.typification`; venta = typification `/venta|exitos/` **o** frase del bot `/felicidad/`.
- Transferencia a agente: nodo con `transfer|handoff|derivac|assign-agent` **o** existe ≥1 mensaje `from:"agent"`.

(Parsers actuales: `classifyNode`, `buildInsights`, `computeDerivations` — `lib/botmaker/insights.ts`, `lib/botmaker.ts`.)

---

## 3. Webhooks (señales en tiempo real)

`message.received`, `message.sent`, `chat.opened`, `chat.closed` (con tipificación), `chat.assigned`
(→ agente), `chat.snoozed`, `contact.created`, `contact.updated` (variables/tags),
`agent.status.changed`, `template.status.changed`. Verificación `x-hub-signature-256` (fail-closed).

> El webhook entrante de WhatsApp es donde llega el **objeto `referral`** de los anuncios Click-to-WhatsApp
> (ver §4.8) — la única forma confiable de capturar `ctwa_clid` para atribución/CAPI.

---

## 4. Mapa por dimensión solicitada → señal → cómputo

Leyenda: ✅ implementado · ⚠️ parcial · ❌ brecha.

### 4.1 Por bot y por canal
- **Canal:** `session.chat.chat.channelId` → `/channels` (`name`, `platform`, `number`). ✅
- **Bot/sub-bot:** `event.info.intentId/intentName` + mapa `botId→nombre` de `/intents`. ✅ (widget "Sub-bots").
- Toda métrica se puede segmentar por `channelId` (filtro ya soportado) y por bot.

### 4.2 Orden de solicitud de datos + variables de almacenamiento
- **Orden:** secuencia temporal de eventos `set-variable` / `fulfilled of "CAMPO"` ordenados por `creationTime`
  → da el **orden real de captura** (ej. teléfono → NIP → nombre → …). El paso promedio (`avgStep`) ya se calcula.
- **Dónde se guarda:** `info.variableName` (la variable destino) + valor en `info.variableValue`.
- **Diccionario:** `/variables` lista las variables definidas (nombre, tipo, categoría).
- Estado: ✅ a nivel de "breakpoints" (Flow Explorer). ⚠️ Falta exponer la **tabla ordenada
  campo→variable→%éxito** como vista explícita.

### 4.3 Tiempo solicitud → respuesta correcta
- **Solicitud:** `creationTime` del mensaje `from:"bot"` que pide el dato (o del nodo que abre el campo).
- **Respuesta correcta:** `creationTime` del evento `fulfilled of "CAMPO"` / `set-variable` correspondiente.
- **Δt = fulfilled − solicitud.** Promedio por campo = tiempo de captura. ⚠️ Hoy solo se calcula
  `avgFirstResponseSec` (global) y `avgAttempts`; **falta el Δt por campo** (recomendado, §5).

### 4.4 Clasificación del tipo de respuesta al pedir un dato
Para cada solicitud de dato, mirar el siguiente mensaje `from:"user"` y los eventos que siguen:
| Tipo de respuesta | Señal |
|---|---|
| **Válida** (se almacena) | evento `fulfilled of "CAMPO"` / `set-variable` con `variableValue`. |
| **Incorrecta** (reintento) | evento `incorrect of "CAMPO"`; el bot vuelve a preguntar. |
| **Imagen no solicitada** | `message.content.type` = `image`/`media` cuando el campo esperaba texto. |
| **Pregunta / duda** | mensaje de usuario seguido de `find-intent` (otra intención) o `isFallback`. |
| **Queja** | `find-intent` a intención de queja, o tipificación negativa. |
| **Inactividad** | evento `inactivity of "CAMPO"` (sin respuesta). |
Estado: ⚠️ se detecta válido/incorrecto/inactividad; **falta** clasificar imagen-no-solicitada / duda / queja
(requiere mirar `content.type` + la intención disparada tras cada solicitud — §5).

### 4.5 Inactividades del usuario
- Evento `inactivity of "CAMPO"` por campo + `lastUserMessageDatetime`. ✅ (timeouts por campo en breakpoints).

### 4.6 Comportamiento del agente / asesores
- **¿Aplica?** Hay agente si existe ≥1 `message.from:"agent"` o un nodo de transferencia. ✅ `computeDerivations`.
- **Bots que solo derivan:** sesión con 1 mensaje de bot + transferencia inmediata y sin captura de variables. ⚠️ detectable, falta widget.
- **Tiempo de respuesta del agente:** Δt entre el mensaje de usuario y el siguiente `from:"agent"`. ⚠️ parcial.
- **¿Quién responde / resolución por asesor?** ❌ **BRECHA**: `/sessions` NO trae la **identidad** del agente
  (`from:"agent"` es anónimo). Para per-asesor hay que cruzar:
  `/chats/:id` (operador asignado) + `chat.assigned` (webhook) + `/chats/:id/messages` (emisor) + `/agents`
  (catálogo). La **resolución** = sesión cerrada con tipificación de éxito tras la intervención del agente.
  Existe además el **reporte de métricas de agentes** nativo de Botmaker (no consumido).

### 4.7 Métricas genéricas
| Métrica | Cómputo | Estado |
|---|---|---|
| Sesiones brutas | `count(sessions)` en la ventana | ✅ |
| Sesiones únicas | `distinct(chat.chat.contactId)` | ✅ (`users`) |
| Mensajes por bot / usuario / agente | `count(messages where from=...)` | ✅ |
| Sesiones por día y hora | `creationTime` → heatmap 7×24 (TZ CDMX) | ✅ |

### 4.8 Tráfico orgánico vs pagado  ❌ BRECHA (señal identificada)
- **Pagado (CTWA):** Meta inyecta un objeto **`referral`** con **`ctwa_clid`** + `source_id` (ad id) + headline
  + body + image en el **webhook entrante de WhatsApp** cuando el usuario llega de un anuncio
  *Click-to-WhatsApp*. Botmaker lo expone en su *Click-to-WhatsApp Dashboard*.
- **Orgánico:** primera interacción **sin** `referral`/`ctwa_clid`.
- **Cómo capturarlo aquí:** persistir `ctwa_clid` y `source_id` (1) desde el webhook de WhatsApp, o (2) si el
  bot los guarda como variable, leerlos de `set-variable` / `/contacts`. Revisar el `/variables` real para ver
  si ya existe una variable tipo `utm_*`, `ad_id`, `referral`, `origen`, `fuente`.
- Una vez capturado, la sesión se etiqueta **pagado** (tiene referral) vs **orgánico** (no), y `ctwa_clid`
  alimenta la CAPI (§4.9).

### 4.9 Venta → Intelix (CRM) → Zapier/Google (CAPI)
- **Venta = cambio de compañía completado** (typification `/venta|exitos/` o frase `/felicidad/` del bot).
- **Intelix** es el CRM de venta. A **Zapier** y a **Google** se envía **solo una copia del registro que se
  convierte en venta**, para construir la **CAPI** (Conversions API for Business Messaging).
- La CAPI requiere `ctwa_clid` (de §4.8) + `action_source=business_messaging` → por eso capturar el referral
  es prerrequisito para atribuir la venta al anuncio pagado.
- Estado: ❌ no hay en este repo un emisor venta→Zapier/Google con `ctwa_clid`; depende de capturar §4.8.

---

## 5. Brechas priorizadas (qué falta para cerrar el mapa)

1. **Identidad y resolución del asesor** (§4.6): cruzar `/chats` + `chat.assigned` + `/chats/:id/messages` +
   `/agents` para métricas per-asesor (quién, Δt, % resolución). Alternativa rápida: consumir el reporte de
   agentes nativo / `POST /metrics/v2/download` (trae transferidas + tipificaciones).
2. **Tráfico orgánico vs pagado** (§4.8): capturar `ctwa_clid`/`referral` desde el webhook de WhatsApp (o de
   `/variables` si el bot ya lo guarda) y etiquetar cada sesión. Habilita atribución y CAPI.
3. **Δt por campo** (§4.3) y **clasificación fina de respuesta** (§4.4: imagen no solicitada / duda / queja):
   ampliar el parser de `insights.ts` para emparejar cada solicitud con el siguiente mensaje de usuario +
   intención disparada + `content.type`.
4. **Tabla campo → variable → orden → %éxito → Δt** (§4.2/4.3) como vista explícita.
5. **`POST /metrics/v2/download`** como fuente complementaria de agregados oficiales (transferidas,
   tipificaciones, abandonadas, NPS) — menos llamadas que paginar `/sessions`.

---

## 6. Recorrido conceptual del bot de portabilidad

```
chat.opened
  └─ [referral? → PAGADO (ctwa_clid) | sin referral → ORGÁNICO]      (§4.8)
  └─ saludo / menú  ──(selectedButton)──►  intención
       └─ set-variable: telefono     (fulfilled | incorrect | inactivity)   paso 1   (§4.2/4.4)
       └─ set-variable: NIP          (fulfilled | incorrect | inactivity)   paso 2
       └─ set-variable: vigencia_NIP (fulfilled | incorrect | inactivity)   paso 3
       └─ set-variable: nombre …     …                                      paso N
  └─ [bot resuelve] ──► typification venta / "felicidades"  ──► VENTA  ──► Intelix + CAPI(ctwa_clid)
  └─ [o] transfer/handoff ──► chat.assigned ──► agente responde (Δt, resolución)   (§4.6)
  └─ chat.closed (typification)
```

Cada arista del recorrido es observable en `events[]`/`messages[]` de la sesión; el orden por
`creationTime` reconstruye el flujo real por bot y por canal.
