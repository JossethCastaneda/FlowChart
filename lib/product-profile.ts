import { z } from "zod";

export const WORKSPACE_KINDS = ["agency", "freelance", "business"] as const;
export const WorkspaceKindSchema = z.enum(WORKSPACE_KINDS);
export type WorkspaceKind = z.infer<typeof WorkspaceKindSchema>;

export const ONBOARDING_STEPS = [
  "workspace",
  "profile",
  "firstClient",
  "firstIntegration",
  "team",
] as const;
export const OnboardingStepSchema = z.enum(ONBOARDING_STEPS);
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export const OnboardingStateSchema = z.object({
  version: z.number().int().positive().default(1),
  completedSteps: z.array(OnboardingStepSchema).default([]),
  dismissed: z.boolean().default(false),
  completedAt: z.string().datetime().nullable().default(null),
});
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  version: 1,
  completedSteps: [],
  dismissed: false,
  completedAt: null,
};

export function parseOnboardingState(value: unknown): OnboardingState {
  const parsed = OnboardingStateSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...DEFAULT_ONBOARDING_STATE };
}

export function completeOnboardingStep(
  current: unknown,
  step: OnboardingStep,
): OnboardingState {
  const state = parseOnboardingState(current);
  const completedSteps = Array.from(new Set([...state.completedSteps, step]));
  const isComplete = ["workspace", "profile", "firstClient"].every((required) =>
    completedSteps.includes(required as OnboardingStep),
  );

  return {
    ...state,
    completedSteps,
    completedAt: isComplete ? state.completedAt ?? new Date().toISOString() : null,
  };
}

// ── Preferencias de notificación ────────────────────────────────────────────
//
// Un evento por cada aviso que el sistema envía de verdad (lib/notifications.ts)
// y un canal por cada vía que ese evento soporta. Las preferencias funcionan
// como VETO: pueden apagar un canal, nunca encender uno que el evento no emite.

export const NOTIFICATION_EVENTS = [
  "taskAssigned",
  "taskStatus",
  "taskPriority",
  "taskComment",
  "sla",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CHANNELS = ["inApp", "email", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

const ChannelsSchema = z.object({
  inApp: z.boolean().default(true),
  email: z.boolean().default(true),
  whatsapp: z.boolean().default(true),
});

/**
 * Qué canales emite realmente cada evento hoy. La pantalla de Preferencias sólo
 * muestra estos: ofrecer un interruptor para un canal que el evento no envía
 * sería un control decorativo.
 */
export const NOTIFICATION_EVENT_META: Record<
  NotificationEvent,
  { label: string; description: string; channels: NotificationChannel[] }
> = {
  taskAssigned: {
    label: "Me asignan una tarea",
    description: "Alguien te pone como responsable de una tarea.",
    channels: ["inApp", "email", "whatsapp"],
  },
  taskStatus: {
    label: "Cambia el estado de mi tarea",
    description: "Una tarea tuya pasa a otra columna del tablero.",
    channels: ["inApp", "whatsapp"],
  },
  taskPriority: {
    label: "Cambia la prioridad de mi tarea",
    description: "Suben o bajan la urgencia de algo que tienes asignado.",
    channels: ["inApp", "whatsapp"],
  },
  taskComment: {
    label: "Comentan mi tarea",
    description: "Alguien deja un comentario en una tarea tuya.",
    channels: ["inApp", "whatsapp"],
  },
  sla: {
    label: "SLA por vencer o vencido",
    description: "Una tarea tuya está por pasarse de su tiempo de entrega.",
    channels: ["inApp", "email", "whatsapp"],
  },
};

/** Mapea el `type` que guarda la notificación al evento configurable. */
export const NOTIFICATION_TYPE_TO_EVENT: Record<string, NotificationEvent> = {
  task_assigned: "taskAssigned",
  status_changed: "taskStatus",
  priority_changed: "taskPriority",
  task_comment: "taskComment",
  sla_warning: "sla",
  sla_expired: "sla",
};

/**
 * Temas reales definidos en globals.css. "system" sigue al sistema operativo.
 * El tema se guarda en las preferencias (no sólo en localStorage) para que
 * de verdad viaje entre dispositivos, como promete la pantalla.
 */
export const THEMES = ["system", "dark", "light", "azul"] as const;
export type ThemeId = (typeof THEMES)[number];

export const THEME_META: Record<
  Exclude<ThemeId, "system">,
  { label: string; description: string; swatch: [string, string, string] }
> = {
  dark: {
    label: "Ink",
    description: "Oscuro de alto contraste. El predeterminado.",
    swatch: ["#0b0d12", "#12151c", "#5b9bff"],
  },
  light: {
    label: "Claro",
    description: "Fondo blanco, ideal con mucha luz ambiente.",
    swatch: ["#f5f7fa", "#ffffff", "#2563eb"],
  },
  azul: {
    label: "Azul medianoche",
    description: "Oscuro con base azulada, menos contraste duro.",
    swatch: ["#0c1220", "#111a2e", "#6aa6ff"],
  },
};

export const UserPreferencesSchema = z.object({
  theme: z.enum(THEMES).default("system"),
  reduceMotion: z.boolean().default(false),
  compactTables: z.boolean().default(false),
  notifications: z
    .object({
      taskAssigned: ChannelsSchema.default({ inApp: true, email: true, whatsapp: true }),
      taskStatus: ChannelsSchema.default({ inApp: true, email: true, whatsapp: true }),
      taskPriority: ChannelsSchema.default({ inApp: true, email: true, whatsapp: true }),
      taskComment: ChannelsSchema.default({ inApp: true, email: true, whatsapp: true }),
      sla: ChannelsSchema.default({ inApp: true, email: true, whatsapp: true }),
    })
    .default({
      taskAssigned: { inApp: true, email: true, whatsapp: true },
      taskStatus: { inApp: true, email: true, whatsapp: true },
      taskPriority: { inApp: true, email: true, whatsapp: true },
      taskComment: { inApp: true, email: true, whatsapp: true },
      sla: { inApp: true, email: true, whatsapp: true },
    }),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

const ALL_ON = { inApp: true, email: true, whatsapp: true };

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  reduceMotion: false,
  compactTables: false,
  notifications: {
    taskAssigned: { ...ALL_ON },
    taskStatus: { ...ALL_ON },
    taskPriority: { ...ALL_ON },
    taskComment: { ...ALL_ON },
    sla: { ...ALL_ON },
  },
};

/**
 * Tolerante con las preferencias antiguas (`emailNotifications`, `slaAlerts`,
 * `weeklyDigest`), que eran interruptores globales sin efecto real: si el
 * usuario había apagado el correo, se respeta al migrarlo a la matriz.
 */
export function parseUserPreferences(value: unknown): UserPreferences {
  const parsed = UserPreferencesSchema.safeParse(value ?? {});
  const base = parsed.success ? parsed.data : { ...DEFAULT_USER_PREFERENCES };

  const legacy = (value ?? {}) as Record<string, unknown>;
  const hasNewShape = !!(value as Record<string, unknown> | null)?.notifications;
  if (hasNewShape) return base;

  const emailOff = legacy.emailNotifications === false;
  const slaOff = legacy.slaAlerts === false;
  if (!emailOff && !slaOff) return base;

  return {
    ...base,
    notifications: {
      ...base.notifications,
      taskAssigned: { ...base.notifications.taskAssigned, email: !emailOff },
      sla: emailOff || slaOff
        ? { inApp: !slaOff, email: !emailOff && !slaOff, whatsapp: !slaOff }
        : base.notifications.sla,
    },
  };
}

/** ¿Debe entregarse este aviso por este canal? Por defecto sí. */
export function isChannelAllowed(
  preferences: unknown,
  notificationType: string,
  channel: NotificationChannel,
): boolean {
  const event = NOTIFICATION_TYPE_TO_EVENT[notificationType];
  if (!event) return true; // Tipos no configurables (alertas de Meta, sistema…)
  const prefs = parseUserPreferences(preferences);
  return prefs.notifications[event]?.[channel] ?? true;
}

export const WORKSPACE_KIND_LABELS: Record<WorkspaceKind, string> = {
  agency: "Agencia",
  freelance: "Freelancer",
  business: "Empresa",
};
