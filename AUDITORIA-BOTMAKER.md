# Análisis de la Integración BotMaker — Sodare

> Revisión enfocada (arquitectura, seguridad multi-tenant, rendimiento). Fecha: 2026-06-08.
> Complementa `AUDITORIA-SODARE-v2.md`.

## Qué hace la integración

Analítica **conversacional de solo lectura**. Sodare hace *polling* a **BotMaker API v2.0** (`https://api.botmaker.com/v2.0`) sobre dos endpoints — `GET /channels` y `GET /sessions?include-messages=true&include-events=true` — y **calcula métricas en el servidor** (sesiones, mensajes por origen, tiempos de respuesta, duración, tipificaciones, top de preguntas de usuarios, distribución horaria). **No envía mensajes** por BotMaker (las respuestas del Inbox salen por la API de Meta). Auth con header `access-token`.

**Archivos:**
- `lib/botmaker.ts` — cliente real: `getBotmakerToken()`, `botmakerFetch()` (backoff 429), `listSessions()` (paginado), `computeResultsMetrics()`.
- `app/api/botmaker/channels/route.ts` — lista canales del workspace.
- `app/api/botmaker/analytics/route.ts` — métricas por `channelId` + rango (def. 30 días).
- `components/proyectos/ResultsAnalytics.tsx` — UI dentro del detalle de proyecto.
- `lib/crm/botmaker-api.ts` — clase `BotMakerClient` (**código muerto**, ver H3).
- `prisma/schema.prisma → BotMakerConfig` (**modelo muerto**, ver H2).

```mermaid
flowchart LR
  UI["ResultsAnalytics.tsx\n(detalle de proyecto)"] -->|GET| CH["/api/botmaker/channels"]
  UI -->|GET ?channelId| AN["/api/botmaker/analytics"]
  CH --> LIB["lib/botmaker.ts"]
  AN --> LIB
  LIB -->|getBotmakerToken(workspaceId)| TOK{"Integration\nprovider 'botmaker'\n(cifrado)"}
  TOK -->|fallback| ENV["env BOTMAKER_ACCESS_TOKEN\n(GLOBAL, compartido)"]
  LIB -->|access-token header| BM["BotMaker API v2.0\n/channels · /sessions"]
```

**Resolución del token (`getBotmakerToken`):** (1) `Integration(provider:"botmaker")` cifrada → (2) `process.env.BOTMAKER_ACCESS_TOKEN`. **No existe ningún flujo que escriba `Integration(provider:"botmaker")`** (la API de integraciones solo hace GET/DELETE; `connect/[module]` solo cubre módulos de Facebook). ⇒ En la práctica **el token siempre sale del env global** — un único token BotMaker para **todo** el despliegue.

## Lo que está bien (positivos)

- Token **descifrado** server-side (`decryptToken`); nunca se expone al cliente.
- Header `access-token` (no en query string); **backoff 429** con reintentos.
- Paginación **acotada** (`maxPages=6` × 500 ≈ 3.000 sesiones) y `export const maxDuration = 30` para no agotar la función.
- Ambas rutas verifican **sesión + workspace activo** (`getToken` → `getActiveWorkspaceId`).
- Integración **solo lectura** (sin envío de mensajes) ⇒ superficie de ataque reducida; sin entrada de usuario reenviada a BotMaker.
- La lista de integraciones nunca selecciona `credentials` (comentario explícito).

## Hallazgos

### H1 — [ALTO] Sin aislamiento multi-tenant: fuga cross-tenant potencial
- **Ubicación:** `app/api/botmaker/channels/route.ts`, `app/api/botmaker/analytics/route.ts`, `components/proyectos/ResultsAnalytics.tsx:34,52,94-101`.
- **Problema:** El token BotMaker es **global** (env compartido), y `GET /channels` devuelve **todos** los canales de esa cuenta. La UI los lista en un `<select>` y el usuario puede elegir **cualquier** `channelId`; la ruta de analytics **no valida** que ese `channelId` pertenezca a un canal del proyecto/workspace del usuario. `listSessions` además trae las sesiones de **toda la cuenta**.
- **Riesgo:** Si una sola cuenta BotMaker sirve a varias agencias/clientes (modelo multi-tenant del producto: planes *free/pro/agency*), **cualquier usuario autenticado de cualquier workspace** puede:
  - enumerar los canales (nombres/plataformas) de **otros** clientes;
  - obtener su analítica conversacional, incluyendo **`topUserQuestions`** (texto literal de los primeros mensajes de usuarios finales, 80 chars) y `topTypifications` — es decir, **contenido/PII de conversaciones de otros tenants**.
- **Evidencia:** `channelId` viene de `searchParams.get("channelId")` sin verificación; el `<select>` itera `channels.map(...)` sobre todos los canales de la cuenta; `getBotmakerToken` cae al env global.
- **Remediación:** (a) Hacer **obligatorio** el token por workspace (no usar el env global en producción multi-tenant). (b) Persistir el mapeo **canal → proyecto/workspace** (p. ej. en `Channel.config` o en `BotMakerConfig`) y, en `analytics`, **validar que el `channelId` pertenece al workspace activo** antes de consultar; filtrar `/channels` a los canales del workspace. (Ver *Refactor*.)

### H2 — [MEDIO] `BotMakerConfig.apiKey` en texto plano (y modelo muerto)
- **Ubicación:** `prisma/schema.prisma:205-212`.
- **Problema:** El modelo define `apiKey String` **sin cifrar**, a diferencia de `Integration.credentials` (AES-256). La búsqueda en todo el repo confirma que **`prisma.botMakerConfig` no se usa en ningún sitio** ⇒ hoy es **esquema muerto** (nunca poblado).
- **Riesgo:** Latente: si alguien cablea este modelo (es la relación `Project.botmaker`), guardaría **API keys de BotMaker en claro** en la BD. Inconsistente con el patrón cifrado del resto.
- **Remediación:** Eliminar `BotMakerConfig` o, si se va a usar, **cifrar** el token y reutilizar el patrón `Integration` (AES-256). No introducir una segunda ruta de credenciales sin cifrar.

### H3 — [BAJO] Código muerto: `BotMakerClient` (`lib/crm/botmaker-api.ts`)
- **Problema:** Clase nunca importada (la búsqueda solo encuentra su definición). `getBotErrors()` apunta a un endpoint marcado como *"Example"*, lanza `res.statusText` (poco informativo) y no tiene reintentos. Coexiste con `lib/botmaker.ts`, que es el cliente real.
- **Riesgo:** Confusión/mantenimiento; riesgo de que alguien lo use junto al `apiKey` plano de H2.
- **Remediación:** Borrar el archivo (o consolidarlo en `lib/botmaker.ts`).

### H4 — [BAJO] La UI revela el nombre del env var del servidor
- **Ubicación:** `components/proyectos/ResultsAnalytics.tsx:80`.
- **Problema:** El *empty state* muestra al usuario: *"Configura el access-token … (env `BOTMAKER_ACCESS_TOKEN` o Integraciones)"*, filtrando el nombre exacto de la variable de entorno del servidor.
- **Remediación:** Mensaje genérico ("Conecta BotMaker en Integraciones"); la config de env es tarea de operaciones, no del usuario final.

### H5 — [BAJO/INFO] Métricas potencialmente truncadas + conexión por workspace no implementada
- `listSessions` corta en 6 páginas (~3.000 sesiones): para canales de alto volumen las métricas se **truncan en silencio** (sesgo en promedios/horarios). Considerar exponer "datos parciales" o aumentar/streamear con cuidado del coste BI de BotMaker.
- La rama "token por workspace" de `getBotmakerToken` es **aspiracional**: no hay endpoint que conecte BotMaker por workspace. Conviene implementarlo (resuelve H1) o documentar que es single-account.

## Refactor Propuesto — validar canal por workspace (mitiga H1)

```ts
// app/api/botmaker/analytics/route.ts (extracto)
const channelId = searchParams.get("channelId") || "";

// 1) Token por workspace (no global). Si no hay, no continuar en multi-tenant.
const token = await getWorkspaceBotmakerToken(workspaceId); // sin fallback a env global en prod
if (!token) return NextResponse.json({ connected: false, dataSource: "no_token", metrics: EMPTY_RESULTS_METRICS });

// 2) channelId debe pertenecer a un canal de un proyecto del workspace.
if (channelId) {
  const owns = await prisma.channel.count({
    where: { project: { workspaceId }, config: { path: ["botmakerChannelId"], equals: channelId } },
  });
  if (!owns) return NextResponse.json({ error: "Canal no pertenece al workspace" }, { status: 403 });
}

// 3) Igual en /channels: devolver solo los canales mapeados a proyectos del workspace,
//    no la lista completa de la cuenta BotMaker.
```

## Plan priorizado

1. **H1 (ALTO):** Implementar conexión BotMaker **por workspace** + validar `channelId` contra el workspace + filtrar `/channels`. Evitar el env global en producción multi-tenant.
2. **H2 (MEDIO):** Eliminar o cifrar `BotMakerConfig.apiKey`.
3. **H3/H4 (BAJO):** Borrar `lib/crm/botmaker-api.ts`; generalizar el mensaje de UI.
4. **H5 (INFO):** Señalizar truncamiento de métricas; decidir modelo single-account vs por-workspace.
