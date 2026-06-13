import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { cdmxRange, parseWallClock, type CrmDateRange } from "@/lib/crm/timezone";

/**
 * Cari AI Report API v2 — adaptador de resultados por proyecto.
 * Docs: https://cari.ai/reportapiv2/docshow/{39|jR|jQ|jP|jN}
 *
 * Modelo de la API:
 *  - POST /reportapiv2/v1/createtoken {credentials} → { cariSec, expiresIn }
 *  - Demás reportes: POST con header CariSec; body { date_from, date_to, page, limit }
 *  - Fechas "YYYY-MM-DD HH:MM:SS" (hora de pared → enviamos CDMX SIEMPRE,
 *    ver lib/crm/timezone.ts), máx. 6 meses atrás, máx. 2000 filas/página,
 *    end_of_registers=1 cuando ya no hay más.
 *
 * Cada grupo de reportes (Conversaciones, Servicio, Agentes, Clientes,
 * Personalizados) tiene su PROPIA credencial — por eso credentials es un mapa.
 */

const CARI_BASE = "https://cari.ai/reportapiv2/v1";
const PAGE_LIMIT = 2000;
const MAX_PAGES = 5; // tope de seguridad por reporte (10k filas)

export type CariCredentialKey =
  | "conversaciones" | "servicio" | "agentes" | "clientes" | "personalizados";

export type CariCredentials = Partial<Record<CariCredentialKey, string>>;

/** Resuelve las credenciales Cari del workspace (Integration provider "cari"). */
export async function getCariCredentials(workspaceId: string): Promise<CariCredentials | null> {
  const integ = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "cari", userId: "workspace" } },
  });
  const creds = integ?.credentials as Record<string, unknown> | null;
  if (!integ?.connected || !creds?.accessToken) return null;
  try {
    const parsed = JSON.parse(decryptToken(creds.accessToken as string));
    return typeof parsed === "object" && parsed ? (parsed as CariCredentials) : null;
  } catch {
    logger.warn("cari credentials malformed", { workspaceId });
    return null;
  }
}

// ── Token cache ──────────────────────────────────────────────────────────────
// createtoken devuelve expiresIn ("YYYY-MM-DD HH:MM:SS"). Cacheamos por
// credencial dentro del proceso con margen de 60s.
const tokenCache = new Map<string, { cariSec: string; expiresAt: number }>();

async function getCariSec(credential: string): Promise<string> {
  const hit = tokenCache.get(credential);
  if (hit && hit.expiresAt > Date.now() + 60000) return hit.cariSec;

  const res = await fetch(`${CARI_BASE}/createtoken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials: credential }),
  });
  if (!res.ok) throw new Error(`Cari createtoken HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.cariSec) throw new Error("Cari createtoken sin cariSec");
  // expiresIn es hora de pared del servidor; asumimos validez mínima de 10 min
  // si no se puede parsear, en lugar de adivinar la zona del servidor.
  const expiresAt = Date.now() + 10 * 60 * 1000;
  tokenCache.set(credential, { cariSec: json.cariSec, expiresAt });
  return json.cariSec;
}

/**
 * Valida una credencial Cari contra el endpoint confirmado /createtoken.
 * Devuelve true si responde con cariSec. Reutilizado por el adaptador de
 * analítica para testConnection real (sin loguear la credencial).
 */
export async function validateCariCredential(credential: string): Promise<boolean> {
  const res = await fetch(`${CARI_BASE}/createtoken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials: credential }),
  });
  if (!res.ok) throw new Error(`Cari AI HTTP ${res.status}`);
  const json = await res.json();
  return Boolean(json?.cariSec);
}

/**
 * Ejecuta un reporte paginado completo (hasta MAX_PAGES) con la ventana CDMX.
 * Devuelve las filas crudas del payload.
 */
export async function fetchCariReport(
  credential: string,
  report: string,
  range: CrmDateRange,
  extraBody: Record<string, unknown> = {},
  maxPages = MAX_PAGES,
): Promise<any[]> {
  const cariSec = await getCariSec(credential);
  const rows: any[] = [];
  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(`${CARI_BASE}/${report}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", CariSec: cariSec },
      body: JSON.stringify({
        date_from: range.fromLocal,
        date_to: range.toLocal,
        page,
        limit: PAGE_LIMIT,
        download: false,
        ...extraBody,
      }),
    });
    if (res.status === 401) {
      tokenCache.delete(credential); // token vencido — reintentar una vez
      if (page === 0 && maxPages > 0) return fetchCariReport(credential, report, range, extraBody, maxPages);
      break;
    }
    if (!res.ok) {
      logger.warn("cari report failed", { report, page, status: res.status });
      break;
    }
    const json = await res.json();
    const payload = Array.isArray(json?.payload) ? json.payload : [];
    rows.push(...payload);
    if (json?.end_of_registers === 1 || payload.length < PAGE_LIMIT) break;
  }
  return rows;
}

// ── Resultados normalizados ──────────────────────────────────────────────────
// Mismo "contrato" conceptual que la metodología BotMaker: funnel del cliente,
// razones de no-finalización, errores del bot y tendencias diarias.

export interface CrmFunnelStage {
  key: string;
  label: string;
  count: number;
  rate: number;     // % respecto a la etapa anterior
  dropOff: number;  // absoluto perdido respecto a la etapa anterior
}

export interface CrmDropOffReason {
  key: string;
  label: string;
  count: number;
  pct: number;      // % sobre el total de conversaciones
  insight: string;
}

export interface CrmBotError {
  phrase: string;
  flow: string;
  node: string;
  count: number;
  lastSeen: string;
}

export interface CrmDailyPoint {
  day: string;              // YYYY-MM-DD (día CDMX)
  total: number;            // conversaciones
  bot: number;              // atendidas solo por bot
  transferred: number;      // con transferencia a agente
  attended: number;         // atendidas por agente
  abandoned: number;        // abandono (cliente + agente) + canceladas + no atendidas
}

export interface CariResults {
  connected: boolean;
  partial: boolean;             // true si faltó alguna credencial/reporte
  range: { from: string; to: string; timezone: string };
  kpis: {
    totalConversations: number;
    botOnly: number;
    botContainmentPct: number;  // % atendidas por bot sin agente
    transferred: number;
    agentAttended: number;
    abandoned: number;
    abandonedPct: number;
    completionPct: number;      // % que terminó atendida (bot o agente)
    avgInteractions: number;
  };
  funnel: CrmFunnelStage[];
  dropOffReasons: CrmDropOffReason[];
  botErrors: { unanswered: CrmBotError[]; totalUnanswered: number; systemErrors: number };
  daily: CrmDailyPoint[];
  headline: string;
  insights: string[];
}

const num = (v: unknown): number => {
  const n_ = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[%,]/g, ""));
  return Number.isFinite(n_) ? n_ : 0;
};

/**
 * Descarga los reportes vitales y los normaliza al contrato de resultados.
 * Reportes usados (cada uno con su credencial):
 *  - servicio.indicadoresAtencion → funnel bot→agente + tendencia diaria
 *  - servicio.errores             → errores de sistema
 *  - conversaciones.conversaciones → abandono temprano + interacciones
 *  - conversaciones.frasesSinRespuesta → errores del bot (NLU)
 */
export async function computeCariResults(
  creds: CariCredentials,
  days = 30,
): Promise<CariResults> {
  const range = cdmxRange(days);
  let partial = false;

  const safe = async (credKey: CariCredentialKey, report: string, extra?: Record<string, unknown>) => {
    const credential = creds[credKey];
    if (!credential) { partial = true; return [] as any[]; }
    try {
      return await fetchCariReport(credential, report, range, extra);
    } catch (error) {
      partial = true;
      logger.warn("cari report error", { report, error: error instanceof Error ? error.message : String(error) });
      return [] as any[];
    }
  };

  const [indicadores, conversaciones, frases, errores] = await Promise.all([
    safe("servicio", "indicadoresAtencion"),
    safe("conversaciones", "conversaciones"),
    safe("conversaciones", "frasesSinRespuesta", { status: 0 }),
    safe("servicio", "errores"),
  ]);

  // ── Agregados desde indicadoresAtencion (serie diaria oficial de Cari) ──
  const dailyMap = new Map<string, CrmDailyPoint>();
  for (const day of range.days) dailyMap.set(day, { day, total: 0, bot: 0, transferred: 0, attended: 0, abandoned: 0 });

  let total = 0, botOnly = 0, transferred = 0, attended = 0;
  let canceladas = 0, sinAgentes = 0, noAtendidas = 0, abandonoAgente = 0, abandonoCliente = 0;

  for (const r of indicadores) {
    const w = parseWallClock(r.fecha);
    const t = num(r.total_conversaciones);
    const b = num(r.atendidas_por_bot);
    const tr = num(r.conversaciones_con_transferencia_a_agente);
    const at = num(r["agente._atendidas"]);
    const cc = num(r["cliente._canceladas"]);
    const sa = num(r.agentes_no_disponibles);
    const na = num(r["agente._no_atendidas"]);
    const aa = num(r["agente._abandono"]);
    const ac = num(r["cliente._abandono"]);
    total += t; botOnly += b; transferred += tr; attended += at;
    canceladas += cc; sinAgentes += sa; noAtendidas += na; abandonoAgente += aa; abandonoCliente += ac;
    if (w && dailyMap.has(w.day)) {
      const d = dailyMap.get(w.day)!;
      d.total += t; d.bot += b; d.transferred += tr; d.attended += at;
      d.abandoned += cc + sa + na + aa + ac;
    }
  }

  // ── Abandono temprano desde conversaciones (entrada del funnel) ──
  let abandonoInicioWeb = 0, abandonoPrimeraInteraccion = 0, interaccionesSum = 0;
  for (const c of conversaciones) {
    if (num(c.abandono_inicio_web) > 0 || c.abandono_inicio_web === true) abandonoInicioWeb++;
    if (num(c.abandono_primera_interaccion) > 0 || c.abandono_primera_interaccion === true) abandonoPrimeraInteraccion++;
    interaccionesSum += num(c.total_de_interacciones);
  }
  const convCount = conversaciones.length;

  // ── Errores del bot (frases sin respuesta, agrupadas por frase+nodo) ──
  const phraseMap = new Map<string, CrmBotError>();
  for (const f of frases) {
    const phrase = String(f.frase_sin_respuesta || "").trim().toLowerCase().slice(0, 120);
    if (!phrase) continue;
    const key = `${phrase}|${f.nodo || ""}`;
    const cur = phraseMap.get(key);
    if (cur) { cur.count++; if (String(f.fecha || "") > cur.lastSeen) cur.lastSeen = String(f.fecha || ""); }
    else phraseMap.set(key, {
      phrase,
      flow: String(f.nombre_del_flujo || "—"),
      node: String(f.nodo || "—"),
      count: 1,
      lastSeen: String(f.fecha || ""),
    });
  }
  const unanswered = [...phraseMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // ── Funnel del cliente ──
  const abandonedTotal = canceladas + sinAgentes + noAtendidas + abandonoAgente + abandonoCliente;
  const completed = botOnly + attended;
  const stage = (key: string, label: string, count: number, prev: number): CrmFunnelStage => ({
    key, label, count,
    rate: prev > 0 ? Math.round((count / prev) * 100) : 0,
    dropOff: Math.max(0, prev - count),
  });
  const engagedTotal = Math.max(0, total - abandonoInicioWeb - abandonoPrimeraInteraccion);
  const funnel: CrmFunnelStage[] = [
    { key: "total", label: "Conversaciones iniciadas", count: total, rate: 100, dropOff: 0 },
    stage("engaged", "Pasan la primera interacción", engagedTotal, total),
    stage("handled", "Atendidas (bot o agente)", completed, engagedTotal),
    stage("agent", "Atendidas por agente", attended, transferred || completed),
  ];

  // ── Razones de no-finalización, ordenadas por impacto ──
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
  const dropOffReasons: CrmDropOffReason[] = [
    { key: "abandono_primera", label: "Abandono en la primera interacción", count: abandonoPrimeraInteraccion, pct: pct(abandonoPrimeraInteraccion), insight: "El usuario escribe una vez y no continúa: revisar mensaje de bienvenida y tiempos de respuesta del bot." },
    { key: "abandono_inicio_web", label: "Abandono al inicio (web)", count: abandonoInicioWeb, pct: pct(abandonoInicioWeb), insight: "Abren el widget y no escriben: revisar el disparador/copy inicial del webchat." },
    { key: "abandono_cliente", label: "Cliente abandonó esperando agente", count: abandonoCliente, pct: pct(abandonoCliente), insight: "Esperas largas en cola: revisar dotación de agentes en horas pico." },
    { key: "canceladas", label: "Canceladas por el cliente en cola", count: canceladas, pct: pct(canceladas), insight: "El cliente cancela la transferencia: el bot debería resolver más antes de transferir." },
    { key: "sin_agentes", label: "Sin agentes disponibles", count: sinAgentes, pct: pct(sinAgentes), insight: "Transferencias fuera de horario o sin capacidad: ajustar horarios/derivación." },
    { key: "no_atendidas", label: "Asignadas pero no atendidas", count: noAtendidas, pct: pct(noAtendidas), insight: "El agente nunca respondió: revisar alertas de SLA por agente." },
    { key: "abandono_agente", label: "Agente abandonó la conversación", count: abandonoAgente, pct: pct(abandonoAgente), insight: "Conversaciones cerradas por inactividad del agente: coaching/supervisión." },
  ].filter((r) => r.count > 0).sort((a, b) => b.count - a.count);

  // ── KPIs + narrativa ──
  const botContainmentPct = total > 0 ? Math.round((botOnly / total) * 1000) / 10 : 0;
  const abandonedPct = total > 0 ? Math.round((abandonedTotal / total) * 1000) / 10 : 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  const topReason = dropOffReasons[0];
  const headline =
    total === 0
      ? "Sin conversaciones en el periodo seleccionado."
      : `${completionPct}% de finalización sobre ${total.toLocaleString("es-MX")} conversaciones · contención del bot ${botContainmentPct}%${topReason ? ` · fuga principal: ${topReason.label.toLowerCase()} (${topReason.pct}%)` : ""}.`;

  const insights: string[] = [];
  if (botContainmentPct >= 70) insights.push(`El bot contiene el ${botContainmentPct}% de las conversaciones sin necesidad de agente — buen nivel de automatización.`);
  else if (total > 0) insights.push(`Contención del bot en ${botContainmentPct}%: hay margen para automatizar las consultas que hoy se transfieren a agente.`);
  if (topReason) insights.push(`${topReason.label} es la principal razón de no-finalización (${topReason.count.toLocaleString("es-MX")} casos). ${topReason.insight}`);
  if (unanswered.length > 0) insights.push(`El bot no entendió ${phraseMap.size} frases distintas; la más frecuente: "${unanswered[0].phrase}" (${unanswered[0].count}×). Entrénalas en el flujo "${unanswered[0].flow}".`);
  if (errores.length > 0) insights.push(`${errores.length.toLocaleString("es-MX")} errores de sistema en el periodo — revisar el reporte de errores de Cari para los códigos.`);
  if (sinAgentes > 0 && sinAgentes >= canceladas) insights.push("Las transferencias sin agentes disponibles superan a las canceladas: el cuello es capacidad/horario, no el bot.");

  return {
    connected: true,
    partial,
    range: { from: range.fromLocal, to: range.toLocal, timezone: "America/Mexico_City" },
    kpis: {
      totalConversations: total,
      botOnly,
      botContainmentPct,
      transferred,
      agentAttended: attended,
      abandoned: abandonedTotal,
      abandonedPct,
      completionPct,
      avgInteractions: convCount > 0 ? Math.round((interaccionesSum / convCount) * 10) / 10 : 0,
    },
    funnel,
    dropOffReasons,
    botErrors: { unanswered, totalUnanswered: frases.length, systemErrors: errores.length },
    daily: [...dailyMap.values()],
    headline,
    insights,
  };
}

export const EMPTY_CARI_RESULTS: CariResults = {
  connected: false,
  partial: false,
  range: { from: "", to: "", timezone: "America/Mexico_City" },
  kpis: { totalConversations: 0, botOnly: 0, botContainmentPct: 0, transferred: 0, agentAttended: 0, abandoned: 0, abandonedPct: 0, completionPct: 0, avgInteractions: 0 },
  funnel: [],
  dropOffReasons: [],
  botErrors: { unanswered: [], totalUnanswered: 0, systemErrors: 0 },
  daily: [],
  headline: "Cari AI no está conectado.",
  insights: [],
};
