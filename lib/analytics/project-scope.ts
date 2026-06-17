// ============================================================================
// Acotamiento del módulo "Análisis de Resultados" al ámbito de un PROYECTO.
//
// El modelo normalizado (NormalizedConversation/Message) se aísla por
// `workspaceId`. No existe `projectId` en la conversación normalizada, así que
// el alcance por proyecto se construye con dos dimensiones que SÍ están en el
// modelo real del repo:
//
//   1) PROVEEDORES configurados en el proyecto: Project.crmIntegrationIds (con
//      fallback al legacy crmIntegrationId) → Integration.provider → proveedor
//      normalizado ("botmaker" | "cari_ai").
//
//   2) CANALES configurados en el proyecto: leídos de su configuración real
//      (filas Channel + cuentas sociales) y normalizados a una forma canónica.
//      Solo se admiten los 4 canales de esta vista; el resto se excluye.
//
// Este archivo NO importa prisma: es seguro tanto en cliente como en servidor.
// La resolución contra base de datos vive en `project-scope.server.ts`.
// ============================================================================

/** Únicos canales admitidos en la vista de Análisis de Resultados por proyecto. */
export type CanonicalChannel = "whatsapp" | "instagram" | "facebook" | "messenger" | "webchat";

export const SUPPORTED_CHANNELS: CanonicalChannel[] = ["whatsapp", "instagram", "facebook", "messenger", "webchat"];

/**
 * Aliases de proveedor → canal canónico. Cada proveedor (Cari AI, Botmaker,
 * Meta, etc.) puede reportar el canal con nombres distintos; aquí se concentran
 * todas las variantes conocidas. Las claves se comparan ya normalizadas
 * (minúsculas, separadores colapsados a "_").
 */
export const CHANNEL_ALIASES: Record<CanonicalChannel, string[]> = {
  whatsapp: ["whatsapp", "whats_app", "wa", "waba", "whatsapp_business"],
  instagram: ["instagram", "instagram_dm", "instagram_direct", "ig", "ig_dm"],
  facebook: ["facebook", "facebook_page", "facebook_comments", "fb", "fb_page"],
  messenger: ["messenger", "facebook_messenger", "fb_messenger", "meta_messenger"],
  webchat: ["webchat", "web_chat", "web", "widget", "website_chat", "site_chat"],
};

// Índice inverso alias → canónico (construido una sola vez).
const ALIAS_TO_CANONICAL: Record<string, CanonicalChannel> = (() => {
  const map: Record<string, CanonicalChannel> = {};
  for (const canonical of SUPPORTED_CHANNELS) {
    for (const alias of CHANNEL_ALIASES[canonical]) map[alias] = canonical;
  }
  return map;
})();

/**
 * Normaliza el nombre de canal que reporta un proveedor a su forma canónica.
 * Devuelve `null` si el canal no está soportado en esta vista (debe excluirse).
 *
 *   normalizeChannelName("WhatsApp Business") → "whatsapp"
 *   normalizeChannelName("instagram_direct")  → "instagram"
 *   normalizeChannelName("fb_messenger")       → "messenger"
 *   normalizeChannelName("webchat")            → "webchat"
 *   normalizeChannelName("telegram")           → null  (no soportado)
 */
export function normalizeChannelName(providerChannel: unknown): CanonicalChannel | null {
  if (typeof providerChannel !== "string") return null;
  const key = providerChannel
    .trim()
    .toLowerCase()
    .replace(/[\s\-./]+/g, "_") // espacios, guiones, puntos, slashes → "_"
    .replace(/[^a-z0-9_]/g, ""); // descarta cualquier otro símbolo
  if (!key) return null;
  return ALIAS_TO_CANONICAL[key] ?? null;
}

/**
 * Mapea el `provider` de la integración (cómo se guarda en Integration) al
 * `provider` del modelo normalizado (cómo lo escriben los adapters). Las
 * integraciones CRM de proyecto usan "cari"; las de analítica usan "cari_ai";
 * ambas alimentan el mismo proveedor normalizado.
 *
 * IMPORTANTE: usar `normalizeIntegrationProvider()` para resolver — no indexar
 * este mapa directamente. El mapa es solo el conjunto canónico; la resolución
 * tolera mayúsculas/separadores y aliases conocidos (un provider guardado como
 * "Cari", "CARI_AI" o "cari ai" debe resolver igual que "cari").
 */
export const INTEGRATION_TO_NORMALIZED_PROVIDER: Record<string, string> = {
  botmaker: "botmaker",
  cari: "cari_ai",
  cari_ai: "cari_ai",
};

/**
 * Aliases conocidos → proveedor normalizado, comparados ya normalizados
 * (minúsculas, separadores colapsados a "_"). NO se incluye `custom_crm`: un CRM
 * genérico no es necesariamente Cari y no debe asumirse (sin inventar).
 */
const PROVIDER_ALIASES: Record<string, string> = {
  botmaker: "botmaker",
  bot_maker: "botmaker",
  cari: "cari_ai",
  cari_ai: "cari_ai",
  cariai: "cari_ai",
};

/** Normaliza una cadena de provider a su clave comparable. */
function normalizeProviderKey(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-./]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Resuelve el provider de una integración al proveedor normalizado del modelo
 * analítico, tolerando mayúsculas, separadores y aliases. Devuelve `null` si el
 * provider no tiene adaptador analítico (p. ej. `custom_crm`, `meta`, `google`).
 *
 *   normalizeIntegrationProvider("cari")     → "cari_ai"
 *   normalizeIntegrationProvider("Cari AI")  → "cari_ai"
 *   normalizeIntegrationProvider("CARI_AI")  → "cari_ai"
 *   normalizeIntegrationProvider("BotMaker") → "botmaker"
 *   normalizeIntegrationProvider("custom_crm") → null
 */
export function normalizeIntegrationProvider(raw: unknown): string | null {
  const key = normalizeProviderKey(raw);
  if (!key) return null;
  return PROVIDER_ALIASES[key] ?? INTEGRATION_TO_NORMALIZED_PROVIDER[key] ?? null;
}

/** Etiquetas legibles para el selector de canal del dashboard. */
export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  webchat: "Web Chat",
};

/** Etiquetas legibles para el selector de plataforma/proveedor. */
export const PROVIDER_LABELS: Record<string, string> = {
  botmaker: "Botmaker",
  cari_ai: "Cari AI",
};

/**
 * Canales que cada plataforma analítica puede REALMENTE reportar. Regla de
 * producto: un proyecto envía a UNA sola plataforma (Botmaker o Cari), nunca a
 * ambas. Botmaker maneja conversaciones por WhatsApp, Web Chat, Instagram y
 * Facebook (fanpage → facebook + messenger). Cari solo opera WhatsApp y Web Chat.
 *
 * Se usa para INTERSECAR los canales configurados en el proyecto con los que su
 * proveedor soporta: p. ej. un proyecto Cari con una cuenta de Instagram (para
 * orgánico/ads) NO debe mostrar Instagram en el análisis conversacional.
 */
export const PROVIDER_CHANNELS: Record<string, CanonicalChannel[]> = {
  botmaker: ["whatsapp", "webchat", "instagram", "facebook", "messenger"],
  cari_ai: ["whatsapp", "webchat"],
};

/** Forma mínima de proyecto necesaria para derivar sus canales configurados. */
export interface ProjectChannelConfig {
  whatsapp?: string[] | null;
  instagram?: string[] | null;
  fanpage?: string[] | null;
  /** ID(s) del widget de web chat configurados en el proyecto. */
  webchat?: string[] | null;
  /** Filas Channel del proyecto (cada una con su `type`, p. ej. "WHATSAPP", "META"). */
  channels?: { type?: string | null }[] | null;
}

/**
 * Deriva los canales canónicos REALMENTE configurados en un proyecto, leyendo
 * dos fuentes y normalizando todo a través de `normalizeChannelName`:
 *
 *   - Filas `Channel` (su `type`): se normaliza; lo no soportado (META, GOOGLE,
 *     TIKTOK, webchat, telegram…) se excluye.
 *   - Cuentas sociales vinculadas: `whatsapp[]`→whatsapp, `instagram[]`→instagram,
 *     `fanpage[]`→facebook + messenger (una fanpage habilita publicaciones y DM).
 *
 * No asume que todos los canales existen: solo devuelve los configurados.
 * El resultado se devuelve deduplicado y en orden canónico estable.
 *
 * Si se pasa `provider` (proveedor normalizado del proyecto), el resultado se
 * INTERSECA con `PROVIDER_CHANNELS[provider]`: un canal configurado que el
 * proveedor no soporta (p. ej. Instagram en un proyecto Cari) se excluye. Sin
 * `provider` el comportamiento es el histórico (no interseca) — retrocompatible.
 */
export function collectProjectChannels(
  p: ProjectChannelConfig,
  provider?: string | null
): CanonicalChannel[] {
  const found = new Set<CanonicalChannel>();

  for (const ch of p.channels ?? []) {
    const canonical = normalizeChannelName(ch?.type ?? undefined);
    if (canonical) found.add(canonical);
  }

  if (p.whatsapp && p.whatsapp.length > 0) found.add("whatsapp");
  if (p.instagram && p.instagram.length > 0) found.add("instagram");
  if (p.fanpage && p.fanpage.length > 0) {
    found.add("facebook");
    found.add("messenger");
  }
  if (p.webchat && p.webchat.length > 0) found.add("webchat");

  // Orden canónico estable (whatsapp, instagram, facebook, messenger, webchat).
  let result = SUPPORTED_CHANNELS.filter((c) => found.has(c));

  // Acotar a lo que la plataforma analítica del proyecto puede reportar.
  const allowed = provider ? PROVIDER_CHANNELS[provider] : undefined;
  if (allowed) result = result.filter((c) => allowed.includes(c));

  return result;
}

/**
 * Alias retrocompatible: deriva canales solo desde las cuentas sociales.
 * Se mantiene para no romper llamadas existentes; prefiera `collectProjectChannels`.
 */
export function deriveProjectChannels(p: ProjectChannelConfig): CanonicalChannel[] {
  return collectProjectChannels({ whatsapp: p.whatsapp, instagram: p.instagram, fanpage: p.fanpage, webchat: p.webchat });
}

/**
 * Mapea los `provider` de un conjunto de integraciones a proveedores
 * normalizados, deduplicando y descartando proveedores sin adaptador analítico.
 */
export function deriveNormalizedProviders(integrationProviders: string[]): string[] {
  const out = new Set<string>();
  for (const p of integrationProviders) {
    const mapped = normalizeIntegrationProvider(p);
    if (mapped) out.add(mapped);
  }
  return [...out];
}

export interface ProjectScope {
  projectId: string;
  /** Proveedores normalizados habilitados para el proyecto (p. ej. ["botmaker"]). */
  providers: string[];
  /** Canales canónicos configurados (p. ej. ["whatsapp","instagram"]). */
  channels: CanonicalChannel[];
}
