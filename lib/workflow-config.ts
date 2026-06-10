// Shared types + helpers for the agency workflow (áreas, líderes, SLA).
// The config lives in WorkspaceSettings.areas (JSON) so each team edits its own.

export interface RequestType {
  id: string;
  name: string;
  slaHours: number; // estimated turnaround for this deliverable type
}

export interface AreaPermissions {
  canAccessOps: boolean;
  canAccessPublisher: boolean;
  canAccessInbox: boolean;
  canAccessAds: boolean;
  canAccessAnalytics: boolean;
  canAccessBriefing: boolean;
}

export const DEFAULT_MEMBER_PERMS: AreaPermissions = {
  canAccessOps: true,
  canAccessPublisher: true,
  canAccessInbox: true,
  canAccessAds: true,
  canAccessAnalytics: true,
  canAccessBriefing: true,
};

export const DEFAULT_EXTERNAL_PERMS: AreaPermissions = {
  canAccessOps: true,      // They might need to request tasks
  canAccessPublisher: false,
  canAccessInbox: false,
  canAccessAds: false,
  canAccessAnalytics: false,
  canAccessBriefing: false,
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
    id: "design", name: "Diseño", color: "#f472b6", slaHours: 48,
    requestTypes: [
      { id: "static", name: "Creativo estático", slaHours: 24 },
      { id: "carousel", name: "Carrusel", slaHours: 36 },
      { id: "reel", name: "Reel / Video", slaHours: 48 },
    ],
  },
  {
    id: "comms", name: "Comunicación", color: "#06d6a0", slaHours: 24,
    requestTypes: [
      { id: "copy", name: "Copy / Caption", slaHours: 12 },
      { id: "script", name: "Guion", slaHours: 24 },
    ],
  },
  {
    id: "strategy", name: "Estrategia", color: "#7b61ff", slaHours: 72,
    requestTypes: [
      { id: "brief", name: "Brief", slaHours: 48 },
      { id: "report", name: "Reporte", slaHours: 48 },
    ],
  },
  {
    id: "community", name: "Community", color: "#fb923c", slaHours: 12,
    requestTypes: [{ id: "moderation", name: "Moderación", slaHours: 6 }],
  },
];

function parsePerms(raw: any, defaults: AreaPermissions): AreaPermissions {
  if (!raw || typeof raw !== "object") return { ...defaults };
  return {
    canAccessOps: typeof raw.canAccessOps === "boolean" ? raw.canAccessOps : defaults.canAccessOps,
    canAccessPublisher: typeof raw.canAccessPublisher === "boolean" ? raw.canAccessPublisher : defaults.canAccessPublisher,
    canAccessInbox: typeof raw.canAccessInbox === "boolean" ? raw.canAccessInbox : defaults.canAccessInbox,
    canAccessAds: typeof raw.canAccessAds === "boolean" ? raw.canAccessAds : defaults.canAccessAds,
    canAccessAnalytics: typeof raw.canAccessAnalytics === "boolean" ? raw.canAccessAnalytics : defaults.canAccessAnalytics,
    canAccessBriefing: typeof raw.canAccessBriefing === "boolean" ? raw.canAccessBriefing : defaults.canAccessBriefing,
  };
}

/** Normalize raw JSON into a safe WorkflowConfig. */
export function parseWorkflow(raw: any): WorkflowConfig {
  const areas: Area[] = Array.isArray(raw?.areas)
    ? raw.areas.map((a: any) => ({
        id: String(a.id || ""),
        name: String(a.name || ""),
        color: String(a.color || "#64748b"),
        slaHours: Number(a.slaHours) || 24,
        leadIds: Array.isArray(a.leadIds) ? a.leadIds.map(String) : [],
        memberIds: Array.isArray(a.memberIds) ? a.memberIds.map(String) : [],
        requestTypes: Array.isArray(a.requestTypes)
          ? a.requestTypes.map((t: any) => ({ id: String(t.id || ""), name: String(t.name || ""), slaHours: Number(t.slaHours) || 24 }))
          : [],
        // Preserve granular permissions (previously dropped!)
        permissions: a.permissions ? {
          members: parsePerms(a.permissions.members, DEFAULT_MEMBER_PERMS),
          external: parsePerms(a.permissions.external, DEFAULT_EXTERNAL_PERMS),
        } : undefined,
        requireLeadReview: typeof a.requireLeadReview === "boolean" ? a.requireLeadReview : undefined,
        slaMode: typeof a.slaMode === "string" ? a.slaMode : undefined,
      }))
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
): AreaPermissions {
  // Full access for admins
  if (userRole === "OWNER" || userRole === "ADMIN") {
    return { canAccessOps: true, canAccessPublisher: true, canAccessInbox: true, canAccessAds: true, canAccessAnalytics: true, canAccessBriefing: true };
  }
  // No area configured → full access (no restrictions without area config)
  if (!area) {
    return { ...DEFAULT_MEMBER_PERMS };
  }
  // Leads get full access to their area
  if (area.leadIds.includes(userId)) {
    return { canAccessOps: true, canAccessPublisher: true, canAccessInbox: true, canAccessAds: true, canAccessAnalytics: true, canAccessBriefing: true };
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
