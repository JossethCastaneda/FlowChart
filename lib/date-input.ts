/**
 * lib/date-input.ts — Puente entre `<input type="date">` y las fechas del API.
 *
 * Un `<input type="date">` devuelve `"2026-08-10"`, sin hora ni zona. El API
 * exige ISO con desfase horario, así que enviarlo tal cual falla con
 * "Invalid ISO datetime" y la tarea no se crea.
 *
 * La conversión se hace en el CLIENTE a propósito: solo el navegador conoce la
 * zona del usuario. Si la hiciera el servidor (UTC en producción), "10 de
 * agosto" se guardaría como el 9 a las 18:00 en México y la fecha se vería
 * corrida un día.
 */

/** Convierte `YYYY-MM-DD` en ISO completo con el desfase local del usuario. */
export function dateInputToISO(
  value: string | null | undefined,
  /**
   * `"end"` para fechas de vencimiento: "vence el 10" significa hasta el final
   * de ese día, no a las 00:00. `"start"` para fechas de inicio.
   */
  mode: "start" | "end" = "end"
): string | null {
  if (!value) return null;

  // Si ya viene con hora (el usuario editó un valor previo del API), se respeta.
  if (value.includes("T")) {
    const asDate = new Date(value);
    return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;

  if (mode === "end") date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);

  // toISOString() emite UTC con "Z", que es un ISO con desfase válido.
  return date.toISOString();
}

/** ISO del API → `YYYY-MM-DD` local, para rellenar un `<input type="date">`. */
export function isoToDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  // Se compone a mano en horario LOCAL: `toISOString().slice(0,10)` daría el
  // día anterior para cualquier hora nocturna en zonas al oeste de UTC.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Esquema Zod tolerante para fechas del API.
 *
 * Acepta ISO completo (lo que manda la UI) y también `YYYY-MM-DD`, para que un
 * cliente antiguo, una integración o una llamada manual no fallen con
 * "Invalid ISO datetime". La fecha sola se ancla al MEDIODÍA UTC: es el único
 * punto que cae en el mismo día natural en todas las zonas habitadas, así que
 * la fecha no se corre ni hacia atrás ni hacia adelante.
 */
export function normalizeApiDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
