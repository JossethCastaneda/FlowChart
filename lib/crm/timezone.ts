/**
 * Zona horaria canónica para TODAS las descargas de CRMs conectados vía API.
 *
 * Regla de producto: los reportes de resultados se piden, agrupan y muestran
 * en hora de Ciudad de México (America/Mexico_City), sin importar en qué zona
 * trabaje cada CRM (BotMaker entrega UTC; Cari AI recibe fechas "wall-clock").
 * Centralizar esto aquí evita que cada adaptador haga su propia conversión y
 * que un reporte mezcle días UTC con días locales.
 */

export const CRM_TIMEZONE = process.env.APP_TIMEZONE || "America/Mexico_City";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIMEZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: false, hourCycle: "h23",
});

interface WallClock {
  date: string;      // YYYY-MM-DD (día CDMX)
  time: string;      // HH:MM:SS
  dateTime: string;  // YYYY-MM-DD HH:MM:SS — formato que consumen APIs como Cari
  hour: number;      // 0-23 en CDMX
}

/** Descompone un instante (Date/ms) en su hora de pared CDMX. */
export function wallClock(instant: Date | number): WallClock {
  const d = typeof instant === "number" ? new Date(instant) : instant;
  const parts = Object.fromEntries(
    partsFmt.formatToParts(d).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const time = `${parts.hour}:${parts.minute}:${parts.second}`;
  return { date, time, dateTime: `${date} ${time}`, hour: parseInt(parts.hour, 10) % 24 };
}

/** Día CDMX (YYYY-MM-DD) de un instante. Clave para series diarias. */
export function cdmxDay(instant: Date | number): string {
  return wallClock(instant).date;
}

/** Hora del día (0-23) en CDMX. Para heatmaps por hora. */
export function cdmxHour(instant: Date | number): number {
  return wallClock(instant).hour;
}

export interface CrmDateRange {
  /** Instantes UTC reales (para APIs que reciben ISO, ej. BotMaker). */
  fromISO: string;
  toISO: string;
  /** Hora de pared CDMX "YYYY-MM-DD HH:MM:SS" (para APIs como Cari AI). */
  fromLocal: string;
  toLocal: string;
  /** Días CDMX incluidos, en orden (claves de las series diarias). */
  days: string[];
}

/** Offset (ms) de CDMX respecto a UTC para un instante dado (DST-safe). */
function tzOffsetMs(instant: Date): number {
  const w = wallClock(instant);
  const asUTC = Date.parse(`${w.date}T${w.time}Z`);
  return asUTC - instant.getTime();
}

/**
 * Ventana rodante de `days` días terminando AHORA, anclada a días CDMX:
 * empieza a las 00:00:00 CDMX de hace (days-1) días y termina en el momento
 * actual. Es la ventana que TODOS los adaptadores de CRM deben usar para que
 * "últimos 30 días" signifique lo mismo en BotMaker, Cari y el dashboard.
 */
export function cdmxRange(days: number, now: Date = new Date()): CrmDateRange {
  const rounded = Math.round(days);
  const safeDays = Number.isFinite(rounded)
    ? Math.max(1, Math.min(180, rounded)) // Cari permite máx. 6 meses
    : 30;
  const todayW = wallClock(now);

  // 00:00:00 CDMX del primer día — convertir hora de pared a instante UTC.
  const firstDayMs = Date.parse(`${todayW.date}T00:00:00Z`) - (safeDays - 1) * 86400000;
  const firstWall = new Date(firstDayMs); // medianoche de pared, leída como UTC
  const offset = tzOffsetMs(now);
  const fromInstant = new Date(firstWall.getTime() - offset);

  const fromW = wallClock(fromInstant);
  const days_: string[] = [];
  for (let i = 0; i < safeDays; i++) {
    days_.push(new Date(firstDayMs + i * 86400000).toISOString().slice(0, 10));
  }

  return {
    fromISO: fromInstant.toISOString(),
    toISO: now.toISOString(),
    fromLocal: `${fromW.date} 00:00:00`,
    toLocal: todayW.dateTime,
    days: days_,
  };
}

/**
 * 00:00:00 CDMX del día `dateStr` ("YYYY-MM-DD") como instante UTC (ISO).
 * Para descargas con rango personalizado: el límite inferior de un día CDMX
 * (ej. "2026-06-25" → "2026-06-25T06:00:00.000Z"). DST-safe.
 */
export function cdmxDayStartISO(dateStr: string): string {
  const baseUTC = Date.parse(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(baseUTC)) return new Date().toISOString();
  const offset = tzOffsetMs(new Date(baseUTC));
  return new Date(baseUTC - offset).toISOString();
}

/**
 * 23:59:59.999 CDMX del día `dateStr` como instante UTC (ISO) — límite superior
 * inclusivo de un día CDMX para rangos personalizados.
 */
export function cdmxDayEndISO(dateStr: string): string {
  return new Date(Date.parse(cdmxDayStartISO(dateStr)) + 86400000 - 1).toISOString();
}

/**
 * Parsea un timestamp devuelto por un CRM que trabaja en hora de pared
 * ("YYYY-MM-DD HH:MM:SS" o "YYYY-MM-DD"), tratándolo como hora CDMX.
 * Devuelve { day, hour } listos para agrupar — NO un instante UTC, porque
 * para reportes lo que importa es el día/hora local consistente.
 */
export function parseWallClock(value?: string | null): { day: string; hour: number } | null {
  if (!value) return null;
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}))?/);
  if (!m) return null;
  return { day: m[1], hour: m[2] ? parseInt(m[2], 10) % 24 : 0 };
}
