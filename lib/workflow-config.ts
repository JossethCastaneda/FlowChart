// Shared types + helpers for the agency workflow (áreas, líderes, SLA).
// The config lives in WorkspaceSettings.areas (JSON) so each team edits its own.

import { z } from "zod";

export interface RequestType {
  id: string;
  name: string;
  slaHours: number; // estimated turnaround for this deliverable type
}

export interface AreaPermissions {
  canAccessOps: boolean;
  canEditOps: boolean;
  canAccessPublisher: boolean;
  canEditPublisher: boolean;
  canAccessInbox: boolean;
  canEditInbox: boolean;
  canAccessAds: boolean;
  canEditAds: boolean;
  canAccessAnalytics: boolean;
  canEditAnalytics: boolean;
  /** Ver PII sin enmascarar en Análisis de Resultados (default seguro: false). */
  canViewSensitiveAnalytics: boolean;
  canAccessBriefing: boolean;
  canEditBriefing: boolean;
}

export const DEFAULT_MEMBER_PERMS: AreaPermissions = {
  canAccessOps: true, canEditOps: true,
  canAccessPublisher: true, canEditPublisher: true,
  canAccessInbox: true, canEditInbox: true,
  canAccessAds: true, canEditAds: true,
  canAccessAnalytics: true, canEditAnalytics: true,
  canViewSensitiveAnalytics: false,
  canAccessBriefing: true, canEditBriefing: true,
};

/** Leaders default to full access — same as members, but configurable separately. */
export const DEFAULT_LEADER_PERMS: AreaPermissions = {
  canAccessOps: true, canEditOps: true,
  canAccessPublisher: true, canEditPublisher: true,
  canAccessInbox: true, canEditInbox: true,
  canAccessAds: true, canEditAds: true,
  canAccessAnalytics: true, canEditAnalytics: true,
  canViewSensitiveAnalytics: false,
  canAccessBriefing: true, canEditBriefing: true,
};

export const DEFAULT_EXTERNAL_PERMS: AreaPermissions = {
  canAccessOps: true, canEditOps: false,      // They might need to request tasks
  canAccessPublisher: false, canEditPublisher: false,
  canAccessInbox: false, canEditInbox: false,
  canAccessAds: false, canEditAds: false,
  canAccessAnalytics: false, canEditAnalytics: false,
  canViewSensitiveAnalytics: false,
  canAccessBriefing: false, canEditBriefing: false,
};

export interface Area {
  id: string;
  name: string;
  color: string;
  slaHours: number;      // default turnaround per task for this area (member SLA)
  leadIds: string[];     // team leads — they review/approve
  memberIds: string[];   // members of the area
  requestTypes: RequestType[];
  // Granular permissions per area
  permissions?: {
    leaders: AreaPermissions;  // líderes de área — ahora configurables
    members: AreaPermissions;
    external: AreaPermissions;
  };
  requireLeadReview?: boolean; // per-area override of global flag
  slaMode?: string;            // "manual" | "auto"
}

export interface WorkflowConfig {
  areas: Area[];
  requireLeadReview: boolean;
}

export const DEFAULT_WORKFLOW: WorkflowConfig = { areas: [], requireLeadReview: true };

// Agency-standard suggested departments (marketing best practice) — fully
// editable by the user. Used to seed a workspace that hasn't configured areas.
export const SUGGESTED_AREAS: Omit<Area, "leadIds" | "memberIds">[] = [
  {
    id: "paid", name: "Paid Media", color: "#0081FB", slaHours: 24,
    requestTypes: [
      { id: "setup", name: "Setup de campaña", slaHours: 24 },
      { id: "optimization", name: "Optimización", slaHours: 12 },
    ],
  },
  {
    id: "design", name: "Diseño", color: "#bc5fb2", slaHours: 48,
    requestTypes: [
      { id: "static", name: "Creativo estático", slaHours: 24 },
      { id: "carousel", name: "Carrusel", slaHours: 36 },
      { id: "reel", name: "Reel / Video", slaHours: 48 },
    ],
  },
  {
    id: "comms", name: "Comunicación", color: "#34b77c", slaHours: 24,
    requestTypes: [
      { id: "copy", name: "Copy / Caption", slaHours: 12 },
      { id: "script", name: "Guion", slaHours: 24 },
    ],
  },
  {
    id: "strategy", name: "Estrategia", color: "#8b8df2", slaHours: 72,
    requestTypes: [
      { id: "brief", name: "Brief", slaHours: 48 },
      { id: "report", name: "Reporte", slaHours: 48 },
    ],
  },
  {
    id: "community", name: "Community", color: "#d98843", slaHours: 12,
    requestTypes: [{ id: "moderation", name: "Moderación", slaHours: 6 }],
  },
];

// ── Validación estricta para ESCRITURAS (PUT /api/workspace/settings) ──
// parseWorkflow() sigue siendo el normalizador tolerante para LECTURAS
// (filas históricas pueden tener formas viejas); pero lo que se guarda
// nuevo debe cumplir este esquema en lugar de coercionarse en silencio.

const AreaPermissionsSchema = z.object({
  canAccessOps: z.boolean(), canEditOps: z.boolean().optional().default(false),
  canAccessPublisher: z.boolean(), canEditPublisher: z.boolean().optional().default(false),
  canAccessInbox: z.boolean(), canEditInbox: z.boolean().optional().default(false),
  canAccessAds: z.boolean(), canEditAds: z.boolean().optional().default(false),
  canAccessAnalytics: z.boolean(), canEditAnalytics: z.boolean().optional().default(false),
  canViewSensitiveAnalytics: z.boolean().optional().default(false),
  canAccessBriefing: z.boolean(), canEditBriefing: z.boolean().optional().default(false),
});

const RequestTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slaHours: z.number().positive().max(24 * 90),
});

export const AreaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  color: z.string().max(32),
  slaHours: z.number().positive().max(24 * 90),
  leadIds: z.array(z.string()),
  memberIds: z.array(z.string()),
  requestTypes: z.array(RequestTypeSchema),
  permissions: z
    .object({
      leaders: AreaPermissionsSchema.optional(),
      members: AreaPermissionsSchema,
      external: AreaPermissionsSchema,
    })
    .optional(),
  requireLeadReview: z.boolean().optional(),
  slaMode: z.string().optional(),
});

export const WorkflowConfigSchema = z.object({
  areas: z.array(AreaSchema).max(100),
  requireLeadReview: z.boolean().optional().default(true),
});

// ── Branding por workspace (personalización comercial) ──
export const BrandingSchema = z.object({
  displayName: z.string().max(120).optional(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB")
    .optional(),
});

export type WorkspaceBranding = z.infer<typeof BrandingSchema>;

export function parsePerms(input: unknown, defaults: AreaPermissions): AreaPermissions {
  if (!input || typeof input !== "object") return { ...defaults };
  const raw = input as Record<string, unknown>;
  return {
    canAccessOps: typeof raw.canAccessOps === "boolean" ? raw.canAccessOps : defaults.canAccessOps,
    canEditOps: typeof raw.canEditOps === "boolean" ? raw.canEditOps : (typeof raw.canAccessOps === "boolean" ? raw.canAccessOps : defaults.canEditOps),
    canAccessPublisher: typeof raw.canAccessPublisher === "boolean" ? raw.canAccessPublisher : defaults.canAccessPublisher,
    canEditPublisher: typeof raw.canEditPublisher === "boolean" ? raw.canEditPublisher : (typeof raw.canAccessPublisher === "boolean" ? raw.canAccessPublisher : defaults.canEditPublisher),
    canAccessInbox: typeof raw.canAccessInbox === "boolean" ? raw.canAccessInbox : defaults.canAccessInbox,
    canEditInbox: typeof raw.canEditInbox === "boolean" ? raw.canEditInbox : (typeof raw.canAccessInbox === "boolean" ? raw.canAccessInbox : defaults.canEditInbox),
    canAccessAds: typeof raw.canAccessAds === "boolean" ? raw.canAccessAds : defaults.canAccessAds,
    canEditAds: typeof raw.canEditAds === "boolean" ? raw.canEditAds : (typeof raw.canAccessAds === "boolean" ? raw.canAccessAds : defaults.canEditAds),
    canAccessAnalytics: typeof raw.canAccessAnalytics === "boolean" ? raw.canAccessAnalytics : defaults.canAccessAnalytics,
    canEditAnalytics: typeof raw.canEditAnalytics === "boolean" ? raw.canEditAnalytics : (typeof raw.canAccessAnalytics === "boolean" ? raw.canAccessAnalytics : defaults.canEditAnalytics),
    // PII sensible: NUNCA se hereda de canAccessAnalytics; default seguro false.
    canViewSensitiveAnalytics: typeof raw.canViewSensitiveAnalytics === "boolean" ? raw.canViewSensitiveAnalytics : defaults.canViewSensitiveAnalytics,
    canAccessBriefing: typeof raw.canAccessBriefing === "boolean" ? raw.canAccessBriefing : defaults.canAccessBriefing,
    canEditBriefing: typeof raw.canEditBriefing === "boolean" ? raw.canEditBriefing : (typeof raw.canAccessBriefing === "boolean" ? raw.canAccessBriefing : defaults.canEditBriefing),
  };
}

/** Normalize raw JSON into a safe WorkflowConfig. */
export function parseWorkflow(input: unknown): WorkflowConfig {
  const raw = (input ?? {}) as { areas?: unknown; requireLeadReview?: unknown };
  const areas: Area[] = Array.isArray(raw?.areas)
    ? raw.areas.map((item: unknown) => {
        const a = (item ?? {}) as Record<string, unknown>;
        const perms = a.permissions as { leaders?: unknown; members?: unknown; external?: unknown } | undefined;
        return {
          id: String(a.id || ""),
          name: String(a.name || ""),
          color: String(a.color || "#64748b"),
          slaHours: Number(a.slaHours) || 24,
          leadIds: Array.isArray(a.leadIds) ? a.leadIds.map(String) : [],
          memberIds: Array.isArray(a.memberIds) ? a.memberIds.map(String) : [],
          requestTypes: Array.isArray(a.requestTypes)
            ? a.requestTypes.map((t: unknown) => {
                const rt = (t ?? {}) as Record<string, unknown>;
                return { id: String(rt.id || ""), name: String(rt.name || ""), slaHours: Number(rt.slaHours) || 24 };
              })
            : [],
          // Preserve granular permissions (previously dropped!)
          permissions: perms ? {
            leaders: parsePerms(perms.leaders, DEFAULT_LEADER_PERMS),
            members: parsePerms(perms.members, DEFAULT_MEMBER_PERMS),
            external: parsePerms(perms.external, DEFAULT_EXTERNAL_PERMS),
          } : undefined,
          requireLeadReview: typeof a.requireLeadReview === "boolean" ? a.requireLeadReview : undefined,
          slaMode: typeof a.slaMode === "string" ? a.slaMode : undefined,
        };
      })
    : [];
  return { areas, requireLeadReview: raw?.requireLeadReview !== false };
}

/** The area a user belongs to (first match). */
export function findUserArea(config: WorkflowConfig, userId: string): Area | null {
  return config.areas.find((a) => a.memberIds.includes(userId)) || null;
}

/** Whether a user is a lead of any area. */
export function isLead(config: WorkflowConfig, userId: string): boolean {
  return config.areas.some((a) => a.leadIds.includes(userId));
}

/**
 * Get effective permissions for a user relative to a specific area.
 * - OWNER/ADMIN → all permissions granted
 * - Lead of the area → all permissions granted (including canCloseTasks)
 * - Member of the area → area.permissions.members (or defaults)
 * - External (not in the area) → area.permissions.external (or defaults)
 * - No area → full permissions (unassigned users can do everything)
 */
export function getPermissions(
  area: Area | null,
  userId: string,
  userRole: string, // workspace-level role: OWNER, ADMIN, MEMBER
  memberPerms?: AreaPermissions | null // granular overrides for this specific member
): AreaPermissions {
  // OWNER is always god-mode
  if (userRole === "OWNER") {
    return { ...DEFAULT_MEMBER_PERMS };
  }

  // If this user has granular permissions defined, they override Area logic and ADMIN defaults
  if (memberPerms) {
    return { ...memberPerms };
  }

  // Full access for admins
  if (userRole === "ADMIN") {
    return { ...DEFAULT_MEMBER_PERMS };
  }
  // No area configured → full access (no restrictions without area config)
  if (!area) {
    return { ...DEFAULT_MEMBER_PERMS };
  }
  // Leads get permissions from area.permissions.leaders (configurable, default = full)
  if (area.leadIds.includes(userId)) {
    return area.permissions?.leaders ? { ...area.permissions.leaders } : { ...DEFAULT_LEADER_PERMS };
  }
  // Members of the area
  if (area.memberIds.includes(userId)) {
    return area.permissions?.members ? { ...area.permissions.members } : { ...DEFAULT_MEMBER_PERMS };
  }
  // External users (not in this area)
  return area.permissions?.external ? { ...area.permissions.external } : { ...DEFAULT_EXTERNAL_PERMS };
}

/**
 * Workload-aware ETA in hours: counts the assignee's still-open tasks and
 * multiplies by the area SLA, then adds one SLA for the new task.
 */
export function estimateEtaHours(openTaskCount: number, area: Area): number {
  return (openTaskCount + 1) * (area.slaHours || 24);
}

/** Add hours to `from` and return the resulting Date. */
export function etaDate(hours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}
