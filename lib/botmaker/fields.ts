/**
 * Captura de campos telco (puro, sin dependencias de servidor).
 * ============================================================================
 * Fuente única para el dashboard del EMBUDO DE CAPTURA real de portabilidad
 * (número → NIP → nombre → … → venta). `lib/botmaker.ts` tiene una copia paralela
 * de FIELD_PATTERNS acoplada a prisma/decrypt; este módulo es la versión PURA
 * (solo el tipo BmSession) para que `insights.ts` y `bot-perf.ts` lo reutilicen
 * sin arrastrar dependencias de servidor a módulos compartidos con el cliente.
 *
 * Heurística: el bot anuncia qué dato pide en TEXTO ("tu número", "NIP",
 * "nombre completo"); detectamos el campo por patrón sobre los mensajes del bot.
 * Es aproximado (depende del wording), por eso las cifras de captura se etiquetan
 * como "inferidas", no exactas.
 */
import type { BmSession } from "@/lib/botmaker-api";

export interface FieldPattern {
  key: string;
  label: string;
  re: RegExp;
}

/** Campos de datos que capturan los bots BAIT (mismo set que lib/botmaker.ts). */
export const FIELD_PATTERNS: FieldPattern[] = [
  { key: "numero", label: "Número a cambiar", re: /n[uú]mero (a|que).*(cambiar|portar)|n[uú]mero a (portar|cambiar)|tu n[uú]mero|10 d[ií]gitos/i },
  { key: "nip", label: "NIP", re: /\bnip\b/i },
  { key: "nombre", label: "Nombre completo", re: /nombre completo|\bnombre\b|¿c[oó]mo te llamas/i },
  { key: "correo", label: "Correo", re: /correo|email|e-?mail/i },
  { key: "fecha_nac", label: "Fecha de nacimiento", re: /fecha de nacimiento|nacimiento|naciste/i },
  { key: "estado_nac", label: "Estado de nacimiento", re: /estado de nacimiento|entidad de nacimiento|estado donde naciste/i },
  { key: "vigencia", label: "Vigencia del NIP", re: /vigencia/i },
];

export const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  FIELD_PATTERNS.map((f) => [f.key, f.label])
);

const SALE_PHRASE = /felicidad/i;

const toMs = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v as string);
  return Number.isNaN(t) ? 0 : t;
};

/** ¿El bot mandó un mensaje de felicitación? = venta / cambio completado. */
export function saleByPhrase(s: BmSession): boolean {
  return (s.messages || []).some(
    (m) => m.from !== "user" && SALE_PHRASE.test((m.content?.text || "").toString())
  );
}

// ── Captura del NIP por IMAGEN + OCR ──────────────────────────────────────────
// El flujo OCR pide una imagen (el form la guarda en `ocr_image_url`), luego el
// OCR determina NIP + vigencia + legibilidad. El OCR en sí corre FUERA del
// timeline de `/sessions` (setea variables de contacto, invisibles como eventos),
// así que desde las sesiones se observan dos señales: (a) el usuario MANDÓ una
// imagen, y (b) los NODOS DE RAMA que dependen del OCR ("¿es Legible?" =
// legibilidad, "Fecha Vigencia Nip" = vigencia). El resultado exacto del OCR por
// bot solo es 100% observable vía el webhook (BotmakerOcrExtraction).

const IMG_MSG_TYPES = new Set(["image", "photo", "sticker", "document", "media", "file"]);

/** ¿El usuario envió al menos una imagen/adjunto en la sesión? */
export function userSentImage(s: BmSession): boolean {
  return (s.messages || []).some((m) => {
    if (m.from !== "user") return false;
    const ct = (m.content?.type || "").toString().toLowerCase();
    const media = m.content?.media as { url?: string; type?: string } | null | undefined;
    return IMG_MSG_TYPES.has(ct) || !!(media && (media.url || (media.type || "").toLowerCase().includes("image")));
  });
}

/** Nodo de rama que depende del OCR (legibilidad de la imagen / vigencia del NIP). */
const OCR_NODE_RE = /legible|legib|vigencia\s*nip|fecha\s*vigencia|\bocr\b/i;

/** ¿La sesión atravesó un nodo de validación del OCR (legibilidad/vigencia)? */
export function sessionHasOcrNode(s: BmSession): boolean {
  return (s.events || []).some((e) => {
    const info = (e.info || {}) as Record<string, unknown>;
    const nm = (typeof info.name === "string" ? info.name : "") ||
      (typeof info.executingIntents === "string" ? info.executingIntents : "");
    return OCR_NODE_RE.test(nm);
  });
}

/** Conjunto de campos que el bot pidió por sesión (heurística de texto). */
export function capturedFieldsPerSession(sessions: BmSession[]): Set<string>[] {
  return sessions.map((s) => {
    const set = new Set<string>();
    for (const m of s.messages || []) {
      if (m.from === "user") continue;
      const text = (m.content?.text || "").toString();
      if (!text) continue;
      for (const fp of FIELD_PATTERNS) if (fp.re.test(text)) set.add(fp.key);
    }
    return set;
  });
}

export interface CaptureFunnelStep {
  key: string;
  label: string;
  count: number;       // sesiones que alcanzaron este paso (prefijo)
  pct: number;         // % del total de sesiones
  dropOff: number;     // sesiones perdidas vs paso anterior
  dropOffPct: number;  // % de caída vs paso anterior
}

/**
 * Embudo de captura de PREFIJO (metodología BAIT): una sesión "alcanza" el paso k
 * si el bot le pidió los campos order[0..k]. El paso terminal "venta" usa la regla
 * de felicitación. Orden por defecto número → NIP → nombre (Funnel 2 global).
 */
export function computeCaptureFunnel(
  sessions: BmSession[],
  order: string[] = ["numero", "nip", "nombre"]
): CaptureFunnelStep[] {
  const total = sessions.length;
  const captured = capturedFieldsPerSession(sessions);

  const base = order.map((key, k) => {
    const prefix = order.slice(0, k + 1);
    const count = captured.filter((set) => prefix.every((p) => set.has(p))).length;
    return { key, label: FIELD_LABELS[key] || key, count };
  });
  const ventaCount = sessions.filter((s) => saleByPhrase(s)).length;
  const all = [...base, { key: "venta", label: "Cambio completado", count: ventaCount }];

  return all.map((s, i) => {
    const prev = i === 0 ? total : all[i - 1].count;
    const dropOff = Math.max(0, prev - s.count);
    return {
      key: s.key,
      label: s.label,
      count: s.count,
      pct: total ? Math.round((s.count / total) * 1000) / 10 : 0,
      dropOff,
      dropOffPct: prev ? Math.round((dropOff / prev) * 1000) / 10 : 0,
    };
  });
}
