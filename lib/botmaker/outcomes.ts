/**
 * Normalización de RESULTADOS de conversación (telco / portabilidad).
 * ============================================================================
 * La señal más rica de "qué pasó con la conversación" vive en la tipificación de
 * cierre (`conversation-close.info.typification`), pero llega FRAGMENTADA: el
 * mismo resultado se escribe de N formas (`Venta` / `Venta_exitosa` /
 * `venta_cliente` / `Venta_Bot_Pospago`; `Dejo_de_contestar` / `No_contesta` /
 * `Abandona_conversacion`; `ya_es_bait` / `Ya_es_bait`). Sumadas en crudo, esas
 * variantes dispersan el dato y el dashboard se ve "tosco / poco informativo".
 *
 * Este módulo colapsa esas variantes a un conjunto pequeño y estable de
 * RESULTADOS CANÓNICOS. Dos niveles:
 *   - `classifyTypification(raw)` — solo texto de tipificación.
 *   - `classifyOutcome(flags)`   — a nivel SESIÓN, combina tipificación + señales
 *     de evento (venta por "felicidades", paso a agente, no-entendido, cierre) de
 *     modo que TODA sesión cae en exactamente un bucket → la distribución suma
 *     100% del total. Puro, sin estado → testeable y barato.
 */

/** Resultado canónico de una conversación de portabilidad. */
export type OutcomeKey =
  | "venta"          // cambio de compañía completado (el objetivo)
  | "prospecto"      // prospecto en seguimiento / agenda / oferta enviada
  | "atencion"       // derivó a atención humana / asesor / soporte
  | "no_contesta"    // dejó de contestar / abandonó la conversación
  | "error_tecnico"  // no viable técnico (NIP, ICC, menor de edad, extranjero…)
  | "no_interesa"    // rechazo explícito / no viable comercialmente
  | "no_entendido"   // el bot no comprendió (fallback terminal, sin cierre útil)
  | "ya_cliente"     // ya es cliente Bait/Movistar → no portable, no es pérdida
  | "sin_cierre"     // conversación sin cierre ni señal terminal
  | "otro";          // cerrada pero sin tipificación clasificable

/** Familia de color/semántica para presentación. */
export type OutcomeCategory =
  | "exito"        // logró el objetivo
  | "seguimiento"  // sigue vivo / recontactable
  | "escalado"     // pasó a humano
  | "recuperable"  // se perdió pero es recuperable (reintento / re-engagement)
  | "perdida"      // pérdida dura
  | "neutral"      // no era oportunidad (ya cliente)
  | "sincierre";   // sin señal de resultado

export type OutcomeTone = "good" | "neutral" | "bad" | "warn" | "info";

export interface OutcomeMeta {
  key: OutcomeKey;
  label: string;
  category: OutcomeCategory;
  tone: OutcomeTone;
  /** Orden de presentación (embudo conceptual: éxito → pérdida → ruido). */
  order: number;
}

export const OUTCOMES: Record<OutcomeKey, OutcomeMeta> = {
  venta:         { key: "venta",         label: "Cambio completado",       category: "exito",       tone: "good",    order: 1 },
  prospecto:     { key: "prospecto",     label: "Prospecto / seguimiento", category: "seguimiento", tone: "info",    order: 2 },
  atencion:      { key: "atencion",      label: "Atención humana",         category: "escalado",    tone: "warn",    order: 3 },
  no_contesta:   { key: "no_contesta",   label: "Dejó de contestar",       category: "recuperable", tone: "warn",    order: 4 },
  error_tecnico: { key: "error_tecnico", label: "Error / no viable",       category: "recuperable", tone: "warn",    order: 5 },
  no_interesa:   { key: "no_interesa",   label: "No le interesó",          category: "perdida",     tone: "bad",     order: 6 },
  no_entendido:  { key: "no_entendido",  label: "El bot no entendió",      category: "perdida",     tone: "bad",     order: 7 },
  ya_cliente:    { key: "ya_cliente",    label: "Ya es cliente",           category: "neutral",     tone: "neutral", order: 8 },
  sin_cierre:    { key: "sin_cierre",    label: "Sin cierre",              category: "sincierre",   tone: "neutral", order: 9 },
  otro:          { key: "otro",          label: "Otro",                    category: "sincierre",   tone: "neutral", order: 10 },
};

export const OUTCOME_ORDER: OutcomeKey[] = (Object.values(OUTCOMES) as OutcomeMeta[])
  .sort((a, b) => a.order - b.order)
  .map((o) => o.key);

/** Color por categoría (CSS vars del tema). Centralizado para widgets. */
export const CATEGORY_COLOR: Record<OutcomeCategory, string> = {
  exito: "var(--emerald)",
  seguimiento: "var(--cyan)",
  escalado: "var(--amber)",
  recuperable: "var(--amber)",
  perdida: "var(--red)",
  neutral: "rgba(148,163,184,0.7)",
  sincierre: "rgba(255,255,255,0.25)",
};

/** Quita acentos, baja a minúsculas y unifica separadores a un espacio. */
function norm(raw: string): string {
  return (raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacríticos (escape unicode → robusto a CP1252)
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Reglas en ORDEN: la primera que coincide gana. El orden importa para evitar
// colisiones (p.ej. "no le interesa activar" NO debe caer en venta).
const RULES: { key: OutcomeKey; re: RegExp }[] = [
  // "ya es bait/cliente/movistar" antes que nada: no es venta ni rechazo.
  { key: "ya_cliente",    re: /\bya es (bait|cliente|movistar)|es bait\b|ya es nuestro/ },
  // rechazo / no viable comercial — antes que venta para neutralizar "no le interesa activar".
  { key: "no_interesa",   re: /no le interesa|no interes|no viable|declin|rechaz|no quiere|no acepta/ },
  // abandono / silencio.
  { key: "no_contesta",   re: /dejo de contest|no contest|abandon|no responde|sin respuesta/ },
  // prospecto / seguimiento — ANTES que venta: "propecto_a_venta" es un prospecto
  // en camino a la venta, NO un cambio completado (no inflar la tasa de venta).
  { key: "prospecto",     re: /prospecto|propecto|oferta|saludo|agenda|seguimiento|interesad/ },
  // venta / activación / felicitación.
  { key: "venta",         re: /\bventa|vendid|exitos|felicidad|activacion|compr[oa]\b|cambio complet|portabilidad exito/ },
  // derivación a humano.
  { key: "atencion",      re: /atencion|soporte|gestion por llam|busca atencion|asesor/ },
  // no viable técnico.
  { key: "error_tecnico", re: /\berror|falta nip|nip vencid|menor de edad|extranjer|extrajer|\bicc\b|no porta|cobertura/ },
];

/** Clasifica una tipificación cruda a su resultado canónico (solo texto). */
export function classifyTypification(raw: string | null | undefined): OutcomeKey {
  if (!raw) return "otro";
  const n = norm(raw);
  if (!n) return "otro";
  for (const r of RULES) if (r.re.test(n)) return r.key;
  return "otro";
}

export interface OutcomeFlags {
  /** El bot envió un mensaje de felicitación ("felicidades"). */
  saleByPhrase: boolean;
  /** Tipificación de cierre cruda (puede faltar). */
  typ: string | null;
  /** La conversación pasó por un agente humano. */
  hasAgent: boolean;
  /** El bot respondió "Mensaje por defecto" en algún punto. */
  hasFallback: boolean;
  /** Hubo evento conversation-close. */
  hasClose: boolean;
}

/**
 * Clasifica una SESIÓN a un único resultado canónico combinando la tipificación
 * (rica pero a veces ausente) con las señales de evento. Garantiza que toda
 * sesión cae en un bucket → la distribución de outcomes suma 100%.
 */
export function classifyOutcome(f: OutcomeFlags): OutcomeKey {
  if (f.saleByPhrase) return "venta";
  if (f.typ) {
    const k = classifyTypification(f.typ);
    if (k !== "otro") return k; // tipificación reconocida manda
  }
  // Sin tipificación útil: caer en señales de evento.
  if (f.hasAgent) return "atencion";
  if (f.hasFallback) return "no_entendido";
  if (f.typ || f.hasClose) return "otro"; // cerró pero sin señal clasificable
  return "sin_cierre";
}

export interface OutcomeRow {
  key: OutcomeKey;
  label: string;
  category: OutcomeCategory;
  count: number;
  pct: number;
  /** Tipificaciones crudas que cayeron en este bucket (top por conteo). */
  rawLabels: { name: string; count: number }[];
}

/**
 * Construye las filas de outcomes (ordenadas, con pct sobre `total`) a partir de
 * los conteos por bucket + las etiquetas crudas que cada bucket absorbió.
 */
export function buildOutcomeRows(
  counts: Partial<Record<OutcomeKey, number>>,
  rawByKey: Partial<Record<OutcomeKey, Record<string, number>>>,
  total: number
): OutcomeRow[] {
  const out: OutcomeRow[] = [];
  for (const key of OUTCOME_ORDER) {
    const count = counts[key] || 0;
    if (!count) continue;
    const meta = OUTCOMES[key];
    const raws = rawByKey[key] || {};
    out.push({
      key,
      label: meta.label,
      category: meta.category,
      count,
      pct: total ? Math.round((count / total) * 1000) / 10 : 0,
      rawLabels: Object.entries(raws)
        .map(([name, count]) => ({ name, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 6),
    });
  }
  return out;
}

export interface OutcomeBucket {
  key: OutcomeKey;
  label: string;
  tone: OutcomeTone;
  count: number;
  pct: number;
  /** Tipificaciones crudas que cayeron en este bucket (top por conteo). */
  rawSamples: { name: string; count: number }[];
}

/**
 * Agrupa un mapa de {tipificación cruda → conteo} en resultados canónicos
 * (solo texto), conservando las variantes crudas como muestra. Útil para auditar
 * la normalización de forma aislada.
 */
export function bucketTypifications(raw: Record<string, number>): OutcomeBucket[] {
  const agg = new Map<OutcomeKey, { count: number; raws: Record<string, number> }>();
  let total = 0;
  for (const [name, count] of Object.entries(raw)) {
    if (!count) continue;
    total += count;
    const key = classifyTypification(name);
    const a = agg.get(key) || { count: 0, raws: {} };
    a.count += count;
    a.raws[name] = (a.raws[name] || 0) + count;
    agg.set(key, a);
  }
  const out: OutcomeBucket[] = [];
  for (const key of OUTCOME_ORDER) {
    const a = agg.get(key);
    if (!a || !a.count) continue;
    const meta = OUTCOMES[key];
    out.push({
      key,
      label: meta.label,
      tone: meta.tone,
      count: a.count,
      pct: total ? Math.round((a.count / total) * 1000) / 10 : 0,
      rawSamples: Object.entries(a.raws)
        .map(([name, count]) => ({ name, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 6),
    });
  }
  return out;
}
