/**
 * Botmaker API v2.0 — Cliente completo
 * =====================================================================
 * Base URL : https://api.botmaker.com/v2.0
 * Auth     : header `access-token: <token>`
 * Docs     : https://go.botmaker.com/apidocs/
 *
 * Módulos cubiertos:
 *   1.  SESIONES          — GET /sessions (paginado)
 *   2.  CANALES           — GET /channels
 *   3.  CONTACTOS         — GET/POST/PATCH /contacts, variables, tags
 *   4.  CHATS             — GET /chats, cerrar chat, asignar agente
 *   5.  ACCIONES DE CHAT  — POST /chats-actions/* (enviar mensaje/template)
 *   6.  INTENTS           — POST /intent/v2 (disparar flujo/template)
 *   7.  AGENTES           — GET/POST /agents, roles
 *   8.  PLANTILLAS WA     — GET /waTemplates
 *   9.  NOTIFICACIONES    — POST /notifications (envío masivo / campañas)
 *  10.  E-COMMERCE        — GET/POST /ecommerce/catalogs, products
 *  11.  WEBHOOKS          — GET/POST /webhooks
 *  12.  ANÁLISIS          — helpers de alto nivel (conservados de botmaker.ts)
 *
 * Política de errores:
 *   Todas las funciones devuelven un resultado tipado. Los errores de red
 *   se propagan (el llamador decide cómo manejarlos). Los errores HTTP
 *   4xx/5xx se devuelven como BmApiError con el código HTTP y el cuerpo.
 */

// ── Tipos de soporte ─────────────────────────────────────────────────────────

export interface BmConnection {
  /** URL base (default: https://api.botmaker.com/v2.0) */
  baseUrl: string;
  /** Token de acceso en texto plano (ya descifrado). */
  accessToken: string;
}

export interface BmApiError {
  ok: false;
  status: number;
  message: string;
  body: unknown;
}

export type BmResult<T> = ({ ok: true } & T) | BmApiError;

const DEFAULT_BASE = "https://api.botmaker.com/v2.0";

// ── Capa HTTP ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta una petición autenticada a la API de Botmaker.
 * - Aplica retry automático en 429 (Rate Limit) con backoff exponencial.
 * - También reintenta en errores 5xx transitorios.
 * - Devuelve la Response cruda para que cada función decida cómo parsear.
 */
export async function bmFetch(
  conn: BmConnection,
  path: string,
  init: RequestInit = {},
  retries = 5
): Promise<Response> {
  const url = `${conn.baseUrl || DEFAULT_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "access-token": conn.accessToken,
      ...(init.headers ?? {}),
    },
  });
  // Retry on rate limit (429) and transient server errors (5xx)
  const retryable = res.status === 429 || (res.status >= 500 && res.status <= 504);
  if (retryable && retries > 0) {
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    const attempt = 6 - retries;
    const delay = Math.min(2000 * Math.pow(2, attempt - 1), 32000);
    await new Promise((r) => setTimeout(r, delay));
    return bmFetch(conn, path, init, retries - 1);
  }
  return res;
}

/** Parsea una respuesta y la envuelve en BmResult<T>. */
async function parseResult<T>(res: Response): Promise<BmResult<T>> {
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: true, ...(body as T) };
  }
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string; error?: string })?.message ||
    (body as { message?: string; error?: string })?.error ||
    `HTTP ${res.status}`;
  return { ok: false, status: res.status, message, body };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. SESIONES — GET /sessions
// ═══════════════════════════════════════════════════════════════════════════

export interface BmSessionMessage {
  from?: "bot" | "user" | "agent";
  creationTime?: string | number;
  content?: {
    type?: string;
    text?: string;
    buttons?: unknown;
    selectedButton?: unknown;
    media?: { type?: string; url?: string; caption?: string } | null;
    carouselItems?: unknown;
  } & Record<string, unknown>;
}

export interface BmSessionEvent {
  name?: string;
  creationTime?: string | number;
  info?: {
    typification?: string;
    error?: string;
    errorType?: string;
    reason?: string;
    messageId?: string;
    variableName?: string;
    variableValue?: string;
    intentId?: string;
    intentName?: string;
    isFallback?: boolean;
  } & Record<string, unknown>;
}

export interface BmSession {
  id?: string;
  creationTime?: string | number;
  chat?: {
    chat?: {
      contactId?: string;
      channelId?: string;
    };
    lastUserMessageDatetime?: string;
  };
  messages?: BmSessionMessage[];
  events?: BmSessionEvent[];
}

export interface BmSessionsPage {
  items?: BmSession[];
  nextPage?: string | null;
}

export interface ListSessionsOptions {
  from: string;           // ISO 8601
  to: string;             // ISO 8601
  includeMessages?: boolean;
  includeEvents?: boolean;
  channelId?: string;
  /** Número máximo de páginas a recuperar (cada página ≤ 500). Default: 6. */
  maxPages?: number;
}

/**
 * GET /sessions — lista sesiones paginadas en una ventana de tiempo.
 * Sigue el campo `nextPage` hasta agotar páginas o alcanzar `maxPages`.
 */
export async function listSessions(
  conn: BmConnection,
  opts: ListSessionsOptions
): Promise<BmSession[]> {
  const {
    from,
    to,
    includeMessages = true,
    includeEvents = true,
    channelId,
    maxPages = 6,
  } = opts;

  const qs = new URLSearchParams({
    from,
    to,
    "include-messages": String(includeMessages),
    "include-events": String(includeEvents),
  });
  if (channelId) qs.set("channelId", channelId);

  const all: BmSession[] = [];
  let next: string | null = `/sessions?${qs}`;
  let pages = 0;

  while (next && pages < maxPages) {
    const path = next.startsWith("http")
      ? new URL(next).pathname + new URL(next).search
      : next;
    const res = await bmFetch(conn, path);
    if (!res.ok) {
      console.warn(`[listSessions] Page ${pages + 1} returned ${res.status} for ${from} → ${to}, stopping pagination`);
      break;
    }
    const data: BmSessionsPage = await res.json().catch(() => ({}));
    const items = Array.isArray(data.items) ? data.items : [];
    all.push(...items);
    next = data.nextPage || null;
    pages++;

    // Small delay between pages to avoid rate limiting
    if (next && pages < maxPages) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (pages > 1 || all.length > 0) {
    console.log(`[listSessions] ${from.slice(0,10)} → ${to.slice(0,10)}: ${pages} pages, ${all.length} sessions`);
  }

  return all;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CANALES — GET /channels
// ═══════════════════════════════════════════════════════════════════════════

export type BmChannelCanonical =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "messenger"
  | "webchat";

export interface BmChannel {
  id: string;
  name: string;
  platform: string;
  /** Canonical normalizado para uso interno. */
  canonical: BmChannelCanonical | null;
  /** Número de WhatsApp (solo canales WA). */
  number?: string;
  active: boolean;
}

function resolveCanonical(platform?: string | null, number?: string): BmChannelCanonical | null {
  const p = (platform || "").toLowerCase();
  if (p.includes("whats") || p === "waba") return "whatsapp";
  if (p.includes("insta")) return "instagram";
  if (p.includes("messenger")) return "messenger";
  if (p.includes("facebook") || p === "fb") return "facebook";
  if (p.includes("web") || p === "api" || p === "botmaker") return "webchat";
  if (number) return "whatsapp"; // inferencia por número de teléfono
  return null;
}

export function parseChannels(data: unknown): BmChannel[] {
  const raw = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.items ??
      (data as Record<string, unknown>)?.channels ??
      (data as Record<string, unknown>)?.data ??
      (data as Record<string, unknown>)?.result ??
      []);
  const items = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[];
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return items
    .map((c) => {
      const platform = str(c.platform) || str(c.type) || str(c.channelType);
      const number = str(c.number) || str(c.phoneNumber) || str(c.phone) || undefined;
      return {
        id: str(c.id) || str(c.channelId) || str(c._id),
        name: str(c.name) || str(c.displayName) || str(c.title),
        platform,
        canonical: resolveCanonical(platform, number),
        number,
        active: c.active !== false && c.enabled !== false,
      };
    })
    .filter((c) => c.id);
}

/** GET /channels — canales del bot (WhatsApp, Instagram, Facebook, Webchat). */
export async function listChannels(conn: BmConnection): Promise<BmChannel[]> {
  const res = await bmFetch(conn, "/channels");
  if (!res.ok) {
    console.warn(`[BOTMAKER] GET /channels HTTP ${res.status}`);
    return [];
  }
  const data = await res.json().catch(() => null);
  return parseChannels(data);
}

/** GET /channels/:channelId — datos de un canal específico. */
export async function getChannel(
  conn: BmConnection,
  channelId: string
): Promise<BmResult<{ channel: BmChannel }>> {
  const res = await bmFetch(conn, `/channels/${encodeURIComponent(channelId)}`);
  const result = await parseResult<Record<string, unknown>>(res);
  if (!result.ok) return result;
  const channel = parseChannels([result])[0];
  return { ok: true, channel };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONTACTOS — /contacts
// ═══════════════════════════════════════════════════════════════════════════

export interface BmContact {
  id?: string;
  platformContactId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  platform?: string;
  channelId?: string;
  tags?: string[];
  variables?: Record<string, string | number | boolean | null>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessageAt?: string;
  assignedAgentId?: string | null;
  chatId?: string;
}

export interface ContactsPage {
  items: BmContact[];
  nextPage?: string | null;
  total?: number;
}

export interface ListContactsOptions {
  /** Número de contactos por página (default: 50, max: 200). */
  limit?: number;
  /** Cursor de paginación (valor de `nextPage` de la respuesta anterior). */
  cursor?: string;
  /** Filtrar por plataforma (whatsapp, webchat, instagram, etc.). */
  platform?: string;
  /** Filtrar por tag. */
  tag?: string;
  /** Filtrar por estado. */
  status?: string;
  /** Texto de búsqueda (nombre, email, teléfono). */
  q?: string;
}

/** GET /contacts — lista contactos con paginación. */
export async function listContacts(
  conn: BmConnection,
  opts: ListContactsOptions = {}
): Promise<ContactsPage> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);
  if (opts.platform) qs.set("platform", opts.platform);
  if (opts.tag) qs.set("tag", opts.tag);
  if (opts.status) qs.set("status", opts.status);
  if (opts.q) qs.set("q", opts.q);

  const res = await bmFetch(conn, `/contacts?${qs}`);
  if (!res.ok) return { items: [] };
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  const items = (Array.isArray(data.items) ? data.items : []) as BmContact[];
  return {
    items,
    nextPage: (data.nextPage as string) || null,
    total: (data.total as number) || undefined,
  };
}

/** GET /contacts/:platformContactId — datos de un contacto específico. */
export async function getContact(
  conn: BmConnection,
  platformContactId: string
): Promise<BmResult<{ contact: BmContact }>> {
  const res = await bmFetch(conn, `/contacts/${encodeURIComponent(platformContactId)}`);
  const result = await parseResult<BmContact>(res);
  if (!result.ok) return result;
  return { ok: true, contact: result as unknown as BmContact };
}

export interface UpdateContactOptions {
  platformContactId: string;
  platform: string;
  channelId?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  variables?: Record<string, string | number | boolean | null>;
}

/** PATCH /contacts — actualiza nombre, email, tags o variables de un contacto. */
export async function updateContact(
  conn: BmConnection,
  opts: UpdateContactOptions
): Promise<BmResult<BmContact>> {
  const res = await bmFetch(conn, "/contacts", {
    method: "PATCH",
    body: JSON.stringify(opts),
  });
  return parseResult<BmContact>(res);
}

export interface SetContactVariablesOptions {
  platformContactId: string;
  platform: string;
  channelId?: string;
  variables: Record<string, string | number | boolean | null>;
}

/** Establece variables de un contacto (wrapper sobre updateContact). */
export async function setContactVariables(
  conn: BmConnection,
  opts: SetContactVariablesOptions
): Promise<BmResult<BmContact>> {
  return updateContact(conn, opts);
}

export interface SetContactTagsOptions {
  platformContactId: string;
  platform: string;
  channelId?: string;
  /** Tags a AGREGAR. */
  addTags?: string[];
  /** Tags a QUITAR. */
  removeTags?: string[];
}

/** Agrega o quita tags de un contacto. Hace dos PATCH si necesita ambas ops. */
export async function setContactTags(
  conn: BmConnection,
  opts: SetContactTagsOptions
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const base = {
    platformContactId: opts.platformContactId,
    platform: opts.platform,
    channelId: opts.channelId,
  };

  if (opts.addTags?.length) {
    const res = await updateContact(conn, { ...base, tags: opts.addTags });
    if (!res.ok) errors.push(`addTags: ${res.message}`);
  }
  if (opts.removeTags?.length) {
    // Botmaker usa un campo `removeTags` separado en algunas versiones.
    const r = await bmFetch(conn, "/contacts", {
      method: "PATCH",
      body: JSON.stringify({ ...base, removeTags: opts.removeTags }),
    });
    if (!r.ok) errors.push(`removeTags: HTTP ${r.status}`);
  }
  return { ok: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CHATS — /chats
// ═══════════════════════════════════════════════════════════════════════════

export interface BmChat {
  id?: string;
  contactId?: string;
  channelId?: string;
  platform?: string;
  status?: "open" | "closed" | "pending" | "snoozed";
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  tags?: string[];
  createdAt?: string;
  lastMessageAt?: string;
  messagesCount?: number;
  csat?: number | null;
}

export interface ListChatsOptions {
  status?: "open" | "closed" | "pending";
  channelId?: string;
  agentId?: string;
  limit?: number;
  cursor?: string;
  from?: string;
  to?: string;
}

/** GET /chats — lista chats con filtros opcionales. */
export async function listChats(
  conn: BmConnection,
  opts: ListChatsOptions = {}
): Promise<{ items: BmChat[]; nextPage: string | null }> {
  const qs = new URLSearchParams();
  if (opts.status) qs.set("status", opts.status);
  if (opts.channelId) qs.set("channelId", opts.channelId);
  if (opts.agentId) qs.set("agentId", opts.agentId);
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);
  if (opts.from) qs.set("from", opts.from);
  if (opts.to) qs.set("to", opts.to);

  const res = await bmFetch(conn, `/chats?${qs}`);
  if (!res.ok) return { items: [], nextPage: null };
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  return {
    items: (Array.isArray(data.items) ? data.items : []) as BmChat[],
    nextPage: (data.nextPage as string) || null,
  };
}

/** GET /chats/:chatId — detalles de un chat. */
export async function getChat(
  conn: BmConnection,
  chatId: string
): Promise<BmResult<BmChat>> {
  const res = await bmFetch(conn, `/chats/${encodeURIComponent(chatId)}`);
  return parseResult<BmChat>(res);
}

/** POST /chats/:chatId/close — cierra un chat con tipificación opcional. */
export async function closeChat(
  conn: BmConnection,
  chatId: string,
  opts: { typification?: string; agentId?: string } = {}
): Promise<BmResult<{ chatId: string; closed: boolean }>> {
  const res = await bmFetch(conn, `/chats/${encodeURIComponent(chatId)}/close`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<{ chatId: string; closed: boolean }>(res);
}

/** POST /chats/:chatId/assign — asigna un agente a un chat. */
export async function assignChat(
  conn: BmConnection,
  chatId: string,
  agentId: string
): Promise<BmResult<{ chatId: string; agentId: string }>> {
  const res = await bmFetch(conn, `/chats/${encodeURIComponent(chatId)}/assign`, {
    method: "POST",
    body: JSON.stringify({ agentId }),
  });
  return parseResult<{ chatId: string; agentId: string }>(res);
}

/** POST /chats/:chatId/snooze — pospone un chat. */
export async function snoozeChat(
  conn: BmConnection,
  chatId: string,
  /** Fecha ISO hasta cuando snoozear. */
  until: string
): Promise<BmResult<{ chatId: string; snoozedUntil: string }>> {
  const res = await bmFetch(conn, `/chats/${encodeURIComponent(chatId)}/snooze`, {
    method: "POST",
    body: JSON.stringify({ until }),
  });
  return parseResult<{ chatId: string; snoozedUntil: string }>(res);
}

/** GET /chats/:chatId/messages — historial de mensajes de un chat. */
export async function getChatMessages(
  conn: BmConnection,
  chatId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ items: BmSessionMessage[]; nextPage: string | null }> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);

  const res = await bmFetch(conn, `/chats/${encodeURIComponent(chatId)}/messages?${qs}`);
  if (!res.ok) return { items: [], nextPage: null };
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  return {
    items: (Array.isArray(data.items) ? data.items : []) as BmSessionMessage[],
    nextPage: (data.nextPage as string) || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ACCIONES DE CHAT — /chats-actions
// ═══════════════════════════════════════════════════════════════════════════

export interface SendMessageOptions {
  /** Plataforma de destino (Whatsapp, webchat, instagram, etc.) */
  chatPlatform: string;
  /** ID del canal en Botmaker. */
  chatChannelId: string;
  /** ID del contacto en la plataforma (ej. número WhatsApp). */
  platformContactId: string;
  /** Texto del mensaje. */
  messageText: string;
  /** Payload adicional para el webhook (objeto serializado en JSON). */
  webhookPayload?: string;
}

/**
 * POST /chats-actions/send-message — envía un mensaje de texto a un contacto
 * en una conversación ABIERTA (dentro de la ventana de 24h de WhatsApp).
 */
export async function sendMessage(
  conn: BmConnection,
  opts: SendMessageOptions
): Promise<BmResult<{ messageId?: string }>> {
  const res = await bmFetch(conn, "/chats-actions/send-message", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<{ messageId?: string }>(res);
}

export interface SendImageOptions {
  chatPlatform: string;
  chatChannelId: string;
  platformContactId: string;
  imageUrl: string;
  caption?: string;
}

/** POST /chats-actions/send-image — envía una imagen. */
export async function sendImage(
  conn: BmConnection,
  opts: SendImageOptions
): Promise<BmResult<{ messageId?: string }>> {
  const res = await bmFetch(conn, "/chats-actions/send-image", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<{ messageId?: string }>(res);
}

export interface SendDocumentOptions {
  chatPlatform: string;
  chatChannelId: string;
  platformContactId: string;
  documentUrl: string;
  fileName?: string;
  caption?: string;
}

/** POST /chats-actions/send-document — envía un documento/PDF. */
export async function sendDocument(
  conn: BmConnection,
  opts: SendDocumentOptions
): Promise<BmResult<{ messageId?: string }>> {
  const res = await bmFetch(conn, "/chats-actions/send-document", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<{ messageId?: string }>(res);
}

export interface SendButtonsOptions {
  chatPlatform: string;
  chatChannelId: string;
  platformContactId: string;
  messageText: string;
  buttons: { id: string; title: string }[];
}

/** POST /chats-actions/send-buttons — envía botones de respuesta rápida. */
export async function sendButtons(
  conn: BmConnection,
  opts: SendButtonsOptions
): Promise<BmResult<{ messageId?: string }>> {
  const res = await bmFetch(conn, "/chats-actions/send-buttons", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<{ messageId?: string }>(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. INTENTS — POST /intent/v2 (disparar flujos y plantillas)
// ═══════════════════════════════════════════════════════════════════════════

export interface TriggerIntentOptions {
  /** Plataforma (Whatsapp, instagram, webchat, etc.) */
  chatPlatform: string;
  /**
   * Número del canal (número de WhatsApp de la empresa).
   * Requerido para WA; omitir o poner vacío en otros canales.
   */
  chatChannelNumber: string;
  /** ID del contacto/teléfono del cliente (con código de país, sin +). */
  platformContactId: string;
  /** Nombre o ID del intent / plantilla aprobada. */
  ruleNameOrId: string;
  /** Variables de la plantilla o flujo (clave → valor). */
  variables?: Record<string, string | number | boolean | null>;
  /** Payload de webhook adicional. */
  webhookPayload?: string;
}

/**
 * POST /intent/v2 — dispara un intent o plantilla de WhatsApp aprobada.
 * Úsalo para:
 *  - Enviar mensajes fuera de la ventana de 24h (templates HSM).
 *  - Iniciar un flujo del bot desde una integración externa.
 *  - Reactivar una conversación dormida.
 */
export async function triggerIntent(
  conn: BmConnection,
  opts: TriggerIntentOptions
): Promise<BmResult<{ intentId?: string; conversationId?: string }>> {
  const res = await bmFetch(conn, "/intent/v2", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<{ intentId?: string; conversationId?: string }>(res);
}

/**
 * Alias semántico: envía una plantilla WhatsApp HSM aprobada.
 * Equivalent a triggerIntent pero con nombre más claro para templates.
 */
export async function sendWhatsAppTemplate(
  conn: BmConnection,
  opts: {
    /** Número del canal (empresa). */
    channelNumber: string;
    /** Número del destinatario (con código de país, sin +). */
    contactPhone: string;
    /** Nombre exacto de la plantilla aprobada en Botmaker/Meta. */
    templateName: string;
    /** Variables de la plantilla ({{1}}, {{2}}, …). */
    variables?: Record<string, string | number | boolean | null>;
  }
): Promise<BmResult<{ intentId?: string; conversationId?: string }>> {
  return triggerIntent(conn, {
    chatPlatform: "Whatsapp",
    chatChannelNumber: opts.channelNumber,
    platformContactId: opts.contactPhone,
    ruleNameOrId: opts.templateName,
    variables: opts.variables,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. AGENTES — /agents
// ═══════════════════════════════════════════════════════════════════════════

export interface BmAgent {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  channelIds?: string[];
  status?: "online" | "offline" | "busy";
  active?: boolean;
  createdAt?: string;
}

/** GET /agents — lista todos los agentes del bot. */
export async function listAgents(
  conn: BmConnection,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ items: BmAgent[]; nextPage: string | null }> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);

  const res = await bmFetch(conn, `/agents?${qs}`);
  if (!res.ok) return { items: [], nextPage: null };
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  return {
    items: (Array.isArray(data.items) ? data.items : []) as BmAgent[],
    nextPage: (data.nextPage as string) || null,
  };
}

/** GET /agents/:agentId — datos de un agente. */
export async function getAgent(
  conn: BmConnection,
  agentId: string
): Promise<BmResult<BmAgent>> {
  const res = await bmFetch(conn, `/agents/${encodeURIComponent(agentId)}`);
  return parseResult<BmAgent>(res);
}

export interface CreateAgentOptions {
  name: string;
  email: string;
  role?: string;
  channelIds?: string[];
  password?: string;
}

/** POST /agents — crea un nuevo agente. */
export async function createAgent(
  conn: BmConnection,
  opts: CreateAgentOptions
): Promise<BmResult<BmAgent>> {
  const res = await bmFetch(conn, "/agents", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<BmAgent>(res);
}

/** PATCH /agents/:agentId — actualiza datos de un agente. */
export async function updateAgent(
  conn: BmConnection,
  agentId: string,
  opts: Partial<CreateAgentOptions>
): Promise<BmResult<BmAgent>> {
  const res = await bmFetch(conn, `/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    body: JSON.stringify(opts),
  });
  return parseResult<BmAgent>(res);
}

/** DELETE /agents/:agentId — desactiva un agente. */
export async function deleteAgent(
  conn: BmConnection,
  agentId: string
): Promise<BmResult<{ deleted: boolean }>> {
  const res = await bmFetch(conn, `/agents/${encodeURIComponent(agentId)}`, {
    method: "DELETE",
  });
  return parseResult<{ deleted: boolean }>(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. PLANTILLAS WHATSAPP — /waTemplates
// ═══════════════════════════════════════════════════════════════════════════

export interface BmWaTemplate {
  id?: string;
  name?: string;
  status?: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  category?: string;
  language?: string;
  components?: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    text?: string;
    format?: string;
    buttons?: Array<{ type: string; text: string; url?: string; phoneNumber?: string }>;
  }>;
  channelId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /waTemplates — lista plantillas de WhatsApp de la cuenta. */
export async function listWaTemplates(
  conn: BmConnection,
  opts: { channelId?: string; status?: string } = {}
): Promise<BmWaTemplate[]> {
  const qs = new URLSearchParams();
  if (opts.channelId) qs.set("channelId", opts.channelId);
  if (opts.status) qs.set("status", opts.status);

  const res = await bmFetch(conn, `/waTemplates?${qs}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const raw = Array.isArray(data) ? data : (data as Record<string, unknown>)?.items ?? [];
  return (Array.isArray(raw) ? raw : []) as BmWaTemplate[];
}

/** GET /waTemplates/:name — datos de una plantilla por nombre. */
export async function getWaTemplate(
  conn: BmConnection,
  name: string
): Promise<BmResult<BmWaTemplate>> {
  const res = await bmFetch(conn, `/waTemplates/${encodeURIComponent(name)}`);
  return parseResult<BmWaTemplate>(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. NOTIFICACIONES — /notifications (Notification Engine / campañas)
// ═══════════════════════════════════════════════════════════════════════════

export interface BmNotificationRecipient {
  /** Número de teléfono o ID de la plataforma del destinatario. */
  platformContactId: string;
  /** Variables específicas para este destinatario (sobrescriben las globales). */
  variables?: Record<string, string | number | boolean | null>;
}

export interface SendNotificationOptions {
  /** Nombre/ID del intent o template a enviar. */
  ruleNameOrId: string;
  /** Número de canal (WhatsApp empresarial). */
  chatChannelNumber: string;
  /** Plataforma (default: Whatsapp). */
  chatPlatform?: string;
  /** Lista de destinatarios. */
  recipients: BmNotificationRecipient[];
  /** Variables globales (aplican a todos los destinatarios sin override). */
  globalVariables?: Record<string, string | number | boolean | null>;
  /** Nombre identificador de la campaña (para reportes). */
  campaignName?: string;
  /** Fecha de envío programado (ISO 8601). Si no se pasa, envío inmediato. */
  scheduledAt?: string;
}

export interface BmNotificationResult {
  notificationId?: string;
  status?: string;
  queued?: number;
  failed?: number;
}

/**
 * POST /notifications — envía un mensaje masivo (campaña) a múltiples
 * destinatarios usando una plantilla aprobada del Notification Engine.
 * Ideal para HSMs fuera de la ventana de 24h.
 */
export async function sendNotification(
  conn: BmConnection,
  opts: SendNotificationOptions
): Promise<BmResult<BmNotificationResult>> {
  const payload = {
    chatPlatform: opts.chatPlatform ?? "Whatsapp",
    chatChannelNumber: opts.chatChannelNumber,
    ruleNameOrId: opts.ruleNameOrId,
    recipients: opts.recipients,
    variables: opts.globalVariables ?? {},
    campaignName: opts.campaignName,
    scheduledAt: opts.scheduledAt,
  };
  const res = await bmFetch(conn, "/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseResult<BmNotificationResult>(res);
}

/** GET /notifications — lista campañas/notificaciones programadas. */
export async function listNotifications(
  conn: BmConnection,
  opts: { status?: string; limit?: number; cursor?: string } = {}
): Promise<{ items: BmNotificationResult[]; nextPage: string | null }> {
  const qs = new URLSearchParams();
  if (opts.status) qs.set("status", opts.status);
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);

  const res = await bmFetch(conn, `/notifications?${qs}`);
  if (!res.ok) return { items: [], nextPage: null };
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  return {
    items: (Array.isArray(data.items) ? data.items : []) as BmNotificationResult[],
    nextPage: (data.nextPage as string) || null,
  };
}

/** DELETE /notifications/:notificationId — cancela una campaña programada. */
export async function cancelNotification(
  conn: BmConnection,
  notificationId: string
): Promise<BmResult<{ cancelled: boolean }>> {
  const res = await bmFetch(conn, `/notifications/${encodeURIComponent(notificationId)}`, {
    method: "DELETE",
  });
  return parseResult<{ cancelled: boolean }>(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. E-COMMERCE — /ecommerce
// ═══════════════════════════════════════════════════════════════════════════

export interface BmProduct {
  id?: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
  sku?: string;
  available?: boolean;
  catalogId?: string;
}

export interface BmCatalog {
  id?: string;
  name?: string;
  channelId?: string;
  products?: BmProduct[];
  createdAt?: string;
}

/** GET /ecommerce/catalogs — lista catálogos de e-commerce. */
export async function listCatalogs(conn: BmConnection): Promise<BmCatalog[]> {
  const res = await bmFetch(conn, "/ecommerce/catalogs");
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const raw = Array.isArray(data) ? data : (data as Record<string, unknown>)?.items ?? [];
  return (Array.isArray(raw) ? raw : []) as BmCatalog[];
}

/** GET /ecommerce/catalogs/:catalogId — detalle de un catálogo. */
export async function getCatalog(
  conn: BmConnection,
  catalogId: string
): Promise<BmResult<BmCatalog>> {
  const res = await bmFetch(conn, `/ecommerce/catalogs/${encodeURIComponent(catalogId)}`);
  return parseResult<BmCatalog>(res);
}

/** GET /ecommerce/catalogs/:catalogId/products — productos de un catálogo. */
export async function listProducts(
  conn: BmConnection,
  catalogId: string,
  opts: { limit?: number; cursor?: string; q?: string } = {}
): Promise<{ items: BmProduct[]; nextPage: string | null }> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set("limit", String(opts.limit));
  if (opts.cursor) qs.set("cursor", opts.cursor);
  if (opts.q) qs.set("q", opts.q);

  const res = await bmFetch(conn, `/ecommerce/catalogs/${encodeURIComponent(catalogId)}/products?${qs}`);
  if (!res.ok) return { items: [], nextPage: null };
  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  return {
    items: (Array.isArray(data.items) ? data.items : []) as BmProduct[],
    nextPage: (data.nextPage as string) || null,
  };
}

export interface CreateProductOptions {
  name: string;
  price: number;
  currency?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  sku?: string;
  available?: boolean;
}

/** POST /ecommerce/catalogs/:catalogId/products — crea un producto. */
export async function createProduct(
  conn: BmConnection,
  catalogId: string,
  opts: CreateProductOptions
): Promise<BmResult<BmProduct>> {
  const res = await bmFetch(
    conn,
    `/ecommerce/catalogs/${encodeURIComponent(catalogId)}/products`,
    { method: "POST", body: JSON.stringify(opts) }
  );
  return parseResult<BmProduct>(res);
}

/** PATCH /ecommerce/catalogs/:catalogId/products/:productId — actualiza un producto. */
export async function updateProduct(
  conn: BmConnection,
  catalogId: string,
  productId: string,
  opts: Partial<CreateProductOptions>
): Promise<BmResult<BmProduct>> {
  const res = await bmFetch(
    conn,
    `/ecommerce/catalogs/${encodeURIComponent(catalogId)}/products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: JSON.stringify(opts) }
  );
  return parseResult<BmProduct>(res);
}

/** DELETE /ecommerce/catalogs/:catalogId/products/:productId — elimina un producto. */
export async function deleteProduct(
  conn: BmConnection,
  catalogId: string,
  productId: string
): Promise<BmResult<{ deleted: boolean }>> {
  const res = await bmFetch(
    conn,
    `/ecommerce/catalogs/${encodeURIComponent(catalogId)}/products/${encodeURIComponent(productId)}`,
    { method: "DELETE" }
  );
  return parseResult<{ deleted: boolean }>(res);
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. WEBHOOKS — /webhooks
// ═══════════════════════════════════════════════════════════════════════════

export interface BmWebhook {
  id?: string;
  url?: string;
  events?: string[];
  channelId?: string;
  active?: boolean;
  secret?: string;
  createdAt?: string;
}

/** GET /webhooks — lista los webhooks configurados. */
export async function listWebhooks(conn: BmConnection): Promise<BmWebhook[]> {
  const res = await bmFetch(conn, "/webhooks");
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const raw = Array.isArray(data) ? data : (data as Record<string, unknown>)?.items ?? [];
  return (Array.isArray(raw) ? raw : []) as BmWebhook[];
}

export interface CreateWebhookOptions {
  url: string;
  /** Eventos a suscribir (ej: "message.received", "chat.closed", "contact.updated"). */
  events: string[];
  channelId?: string;
  /** Secret para verificar la firma HMAC de los eventos. */
  secret?: string;
}

/** POST /webhooks — registra un nuevo webhook. */
export async function createWebhook(
  conn: BmConnection,
  opts: CreateWebhookOptions
): Promise<BmResult<BmWebhook>> {
  const res = await bmFetch(conn, "/webhooks", {
    method: "POST",
    body: JSON.stringify(opts),
  });
  return parseResult<BmWebhook>(res);
}

/** DELETE /webhooks/:webhookId — elimina un webhook. */
export async function deleteWebhook(
  conn: BmConnection,
  webhookId: string
): Promise<BmResult<{ deleted: boolean }>> {
  const res = await bmFetch(conn, `/webhooks/${encodeURIComponent(webhookId)}`, {
    method: "DELETE",
  });
  return parseResult<{ deleted: boolean }>(res);
}

/**
 * Verifica la firma HMAC-SHA256 de un evento de webhook entrante.
 * Botmaker incluye la firma en el header `x-botmaker-signature`.
 *
 * @param payload   El cuerpo crudo (string o Buffer) del request.
 * @param secret    El secret configurado al crear el webhook.
 * @param signature El valor del header `x-botmaker-signature`.
 */
export async function verifyWebhookSignature(
  payload: string | ArrayBuffer,
  secret: string,
  signature: string
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const data = typeof payload === "string" ? enc.encode(payload) : payload;
    const sig = await crypto.subtle.sign("HMAC", key, data);
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === signature.replace(/^sha256=/, "");
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. UTILIDADES — helpers de conexión y health-check
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea una BmConnection a partir de credenciales crudas.
 * La baseUrl se normaliza (agrega https:// si falta, quita trailing slash).
 */
export function createConnection(
  accessToken: string,
  baseUrl?: string | null
): BmConnection {
  let b = (baseUrl || "").trim();
  if (!b) b = DEFAULT_BASE;
  if (!/^https?:\/\//i.test(b)) b = "https://" + b;
  return { baseUrl: b.replace(/\/+$/, ""), accessToken };
}

export interface BmHealthCheck {
  ok: boolean;
  latencyMs: number;
  httpStatus: number;
  channelsFound: number;
  error?: string;
}

/**
 * Comprueba la conectividad y validez del token haciendo un GET /channels.
 * Devuelve ok=true, la latencia y cuántos canales encontró.
 * Útil para validar tokens al conectar o monitorear integraciones.
 */
export async function healthCheck(conn: BmConnection): Promise<BmHealthCheck> {
  const t0 = Date.now();
  try {
    const res = await bmFetch(conn, "/channels", {}, 1);
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      return { ok: false, latencyMs, httpStatus: res.status, channelsFound: 0, error: `HTTP ${res.status}` };
    }
    const channels = parseChannels(await res.json().catch(() => null));
    return { ok: true, latencyMs, httpStatus: res.status, channelsFound: channels.length };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, httpStatus: 0, channelsFound: 0, error: String(e) };
  }
}

/** Lista los tipos de eventos de webhook disponibles (documentados). */
export const BM_WEBHOOK_EVENTS = [
  "message.received",       // nuevo mensaje del usuario
  "message.sent",           // mensaje enviado por el bot o agente
  "chat.opened",            // conversación iniciada
  "chat.closed",            // conversación cerrada (con tipificación)
  "chat.assigned",          // chat asignado a un agente
  "chat.snoozed",           // chat pospuesto
  "contact.created",        // nuevo contacto registrado
  "contact.updated",        // variables/tags del contacto actualizados
  "agent.status.changed",   // cambio de estado del agente (online/offline/busy)
  "template.status.changed",// plantilla WhatsApp aprobada/rechazada
] as const;

export type BmWebhookEvent = (typeof BM_WEBHOOK_EVENTS)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Re-export: tipos compartidos con botmaker.ts para interoperabilidad
// ═══════════════════════════════════════════════════════════════════════════

export type {
  BmSession as BotmakerSession,
  BmSessionMessage as BotmakerMessage,
  BmSessionEvent as BotmakerEvent,
  BmChannel as BotmakerChannel,
  BmContact as BotmakerContact,
  BmAgent as BotmakerAgent,
  BmWaTemplate as BotmakerTemplate,
  BmProduct as BotmakerProduct,
};

// ── Interop con lib/botmaker.ts ──────────────────────────────────────────────
// Re-exportamos getBotmakerConnection para que las rutas de API puedan
// importar todo desde un solo módulo sin mezclar botmaker.ts y botmaker-api.ts.
export { getBotmakerConnection } from "@/lib/botmaker";
