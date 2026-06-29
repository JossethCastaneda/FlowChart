/**
 * lib/botmaker/normalize.ts
 *
 * Normalizes Botmaker raw message/event/variable data into canonical types.
 * Scoped exclusively to the Bot Analytics module.
 */

// ---------------------------------------------------------------------------
// Message type normalization
// ---------------------------------------------------------------------------

export type NormalizedMessageType =
  | "button"
  | "text"
  | "image"
  | "audio"
  | "video"
  | "file"
  | "location"
  | "cart"
  | "template"
  | "unknown";

/**
 * Maps a raw Botmaker message contentType / type string to a canonical type.
 */
export function normalizeMessageType(raw: string | null | undefined): NormalizedMessageType {
  if (!raw) return "unknown";
  const t = raw.toLowerCase().trim();
  if (t.includes("button") || t.includes("quick_reply") || t.includes("interactive")) return "button";
  if (t === "text" || t === "chat" || t.includes("text")) return "text";
  if (t.includes("image") || t.includes("photo") || t.includes("sticker")) return "image";
  if (t.includes("audio") || t.includes("voice") || t.includes("ptt")) return "audio";
  if (t.includes("video")) return "video";
  if (t.includes("document") || t.includes("file")) return "file";
  if (t.includes("location")) return "location";
  if (t.includes("cart") || t.includes("order")) return "cart";
  if (t.includes("template") || t.includes("hsm")) return "template";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Sender type normalization
// ---------------------------------------------------------------------------

export type NormalizedSenderType = "user" | "bot" | "agent" | "system";

export function normalizeSenderType(raw: string | null | undefined): NormalizedSenderType {
  if (!raw) return "system";
  const s = raw.toLowerCase().trim();
  if (s === "user" || s === "customer" || s === "contact") return "user";
  if (s === "bot" || s === "chatbot" || s === "virtual" || s === "assistant") return "bot";
  if (s === "agent" || s === "operator" || s === "human") return "agent";
  return "system";
}

// ---------------------------------------------------------------------------
// Platform normalization
// ---------------------------------------------------------------------------

export type NormalizedPlatform =
  | "whatsapp"
  | "messenger"
  | "instagram_comment"
  | "instagram_dm"
  | "webchat"
  | "unknown";

export function normalizePlatform(raw: string | null | undefined): NormalizedPlatform {
  if (!raw) return "unknown";
  const p = raw.toLowerCase().trim();
  if (p.includes("whatsapp") || p.includes("wha") || p === "wa") return "whatsapp";
  if (p.includes("messenger") || p === "fbm" || p === "fb_messenger") return "messenger";
  if (p.includes("instagram") && p.includes("comment")) return "instagram_comment";
  if (p.includes("instagram") || p === "ig") return "instagram_dm";
  if (p.includes("webchat") || p.includes("web") || p.includes("chat")) return "webchat";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Session status normalization
// ---------------------------------------------------------------------------

export type NormalizedSessionStatus = "active" | "closed" | "transferred" | "abandoned" | "stuck";

export function normalizeSessionStatus(raw: string | null | undefined): NormalizedSessionStatus {
  if (!raw) return "active";
  const s = raw.toLowerCase().trim();
  if (s.includes("closed") || s.includes("resuelto") || s.includes("cerrado") || s.includes("done")) return "closed";
  if (s.includes("transfer") || s.includes("handoff") || s.includes("agente")) return "transferred";
  if (s.includes("abandon") || s.includes("drop")) return "abandoned";
  if (s.includes("stuck") || s.includes("stagnant") || s.includes("estanc")) return "stuck";
  return "active";
}

// ---------------------------------------------------------------------------
// PII masking utilities
// ---------------------------------------------------------------------------

const MASK_PII = process.env.MASK_PII !== "false";

/** Masks a phone number, keeping first 3 + country code visible. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  if (!MASK_PII) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "***";
  return digits.slice(0, 3) + "***" + digits.slice(-2);
}

/** Masks an email address. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  if (!MASK_PII) return email;
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 2 ? local[0] + "***" + local[local.length - 1] : "***";
  return `${maskedLocal}@${domain}`;
}

/** Masks a NIP, showing only last 2 characters. */
export function maskNip(nip: string | null | undefined): string {
  if (!nip) return "";
  if (!MASK_PII) return nip;
  if (nip.length <= 2) return "**";
  return "*".repeat(nip.length - 2) + nip.slice(-2);
}

/** Generically masks a string value for safe display. */
export function maskValue(value: string | null | undefined, showLast = 2): string {
  if (!value) return "";
  if (!MASK_PII) return value;
  if (value.length <= showLast) return "*".repeat(value.length);
  return "*".repeat(value.length - showLast) + value.slice(-showLast);
}

// ---------------------------------------------------------------------------
// Button / interactive message normalization
// ---------------------------------------------------------------------------

export interface NormalizedButton {
  label: string;
  payload?: string;
  type: "quick_reply" | "postback" | "url" | "unknown";
}

export function normalizeButtons(raw: unknown): NormalizedButton[] {
  if (!raw || !Array.isArray(raw)) return [];
  return (raw as unknown[]).map((b) => {
    const btn = b as Record<string, unknown>;
    const label = String(btn.title || btn.label || btn.text || btn.payload || "");
    const payload = String(btn.payload || btn.value || "");
    let type: NormalizedButton["type"] = "unknown";
    if (btn.type === "quick_reply" || btn.content_type === "text") type = "quick_reply";
    else if (btn.type === "postback") type = "postback";
    else if (btn.type === "web_url" || (typeof btn.url === "string")) type = "url";
    return { label, payload, type };
  });
}

// ---------------------------------------------------------------------------
// Product type detection heuristics
// ---------------------------------------------------------------------------

export type ProductType = "prepago" | "pospago" | "unknown";

/**
 * Classifies a lead as prepago or pospago based on available signals.
 * Priority: explicit variables > bot name > flow state > intent.
 */
export function detectProductType(opts: {
  variables?: Record<string, { value: string }>;
  botName?: string;
  intentName?: string;
  flowState?: string;
  channelName?: string;
}): ProductType {
  const { variables = {}, botName = "", intentName = "", flowState = "", channelName = "" } = opts;

  // Pospago indicators: email, birth_date, birth_state present
  const pospagoVarNames = [
    "fecha_nacimiento", "Fecha_nacimiento", "Fecha de nacimiento",
    "estado_nacimiento", "Estado_nacimiento", "Estado de nacimiento",
    "correo", "email", "correo_electronico", "Correo electrónico",
  ];
  for (const key of pospagoVarNames) {
    if (variables[key]?.value) return "pospago";
  }

  // Name-based detection
  const namesToCheck = [botName, channelName, intentName, flowState].map(s => s.toLowerCase());
  for (const n of namesToCheck) {
    if (n.includes("pospago")) return "pospago";
    if (n.includes("prepago")) return "prepago";
  }

  // If has prepago minimum fields: name + phone + nip
  const hasName = !!(variables["name"]?.value || variables["Nombre_completo"]?.value);
  const hasPhone = !!(variables["Numero a cambiar"]?.value);
  const hasNip = !!(variables["nip"]?.value);
  if (hasName && hasPhone && hasNip) return "prepago";

  return "unknown";
}
