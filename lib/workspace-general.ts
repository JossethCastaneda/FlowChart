/**
 * lib/workspace-general.ts
 * =====================================================================
 * Ajustes regionales del workspace: zona horaria, idioma, inicio de semana
 * y horario laboral.
 *
 * Viven en `WorkspaceSettings.extConfig.general` (JSON) para no requerir
 * migración. No son cosmética: el cálculo de SLA, los recordatorios y los
 * reportes semanales necesitan saber en qué huso opera el equipo — hasta
 * ahora se asumía el del servidor.
 */

import { z } from "zod";

/** Husos horarios habituales en LATAM/España, más UTC como escape. */
export const TIMEZONES = [
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Tijuana", label: "Tijuana (GMT-8)" },
  { value: "America/Monterrey", label: "Monterrey (GMT-6)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/New_York", label: "Nueva York (GMT-5)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (GMT-8)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "UTC", label: "UTC" },
] as const;

export const LOCALES = [
  { value: "es-MX", label: "Español (México)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-CO", label: "Español (Colombia)" },
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "en-US", label: "English (US)" },
] as const;

export const CURRENCIES = [
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "BRL", label: "Real (BRL)" },
] as const;

export const WorkspaceGeneralSchema = z.object({
  timezone: z.string().min(1).max(64).default("America/Mexico_City"),
  locale: z.string().min(2).max(10).default("es-MX"),
  currency: z.string().min(3).max(3).default("MXN"),
  /** 1 = lunes, 0 = domingo. */
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  /** Hora local de inicio/fin de jornada (0–23). Los SLA sólo corren dentro. */
  workdayStart: z.number().int().min(0).max(23).default(9),
  workdayEnd: z.number().int().min(1).max(24).default(18),
  /** Si está activo, el reloj de SLA se pausa fuera del horario laboral. */
  slaBusinessHoursOnly: z.boolean().default(false),
});

export type WorkspaceGeneral = z.infer<typeof WorkspaceGeneralSchema>;

export const DEFAULT_WORKSPACE_GENERAL: WorkspaceGeneral = {
  timezone: "America/Mexico_City",
  locale: "es-MX",
  currency: "MXN",
  weekStartsOn: 1,
  workdayStart: 9,
  workdayEnd: 18,
  slaBusinessHoursOnly: false,
};

export function parseWorkspaceGeneral(value: unknown): WorkspaceGeneral {
  const parsed = WorkspaceGeneralSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_WORKSPACE_GENERAL };
}
