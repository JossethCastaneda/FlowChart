// Shared types + helpers for the agency workflow (áreas, líderes, SLA).
// The config lives in WorkspaceSettings.areas (JSON) so each team edits its own.

export interface RequestType {
  id: string;
  name: string;
  slaHours: number; // estimated turnaround for this deliverable type
}

export interface Area {
  id: string;
  name: string;
  color: string;
  slaHours: number;      // default turnaround per task for this area (member SLA)
  leadIds: string[];     // team leads — they review/approve
  memberIds: string[];   // members of the area
  requestTypes: RequestType[];
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
