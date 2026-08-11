export interface Member { 
  id: string; 
  name: string; 
  email: string | null; 
  image: string | null; 
  role: string; 
  activityStatus?: string 
}

export interface ProjectLight {
  id: string;
  name: string;
  alias?: string | null;
  client?: string | null;
}

export interface Attachment {
  /** Ausente en adjuntos antiguos creados antes de la subida de evidencias. */
  id?: string;
  name: string;
  url: string;
  /** Fuerza la descarga del archivo ORIGINAL, sin recomprimir. */
  downloadUrl?: string;
  type: string;
  mimeType?: string;
  size: number;
  uploadedAt: string;
  uploadedById?: string;
  uploadedByName?: string;
}

export interface Task {
  id: string; 
  title: string; 
  description: string | null; 
  assignee: string | null; 
  assigneeId?: string | null;
  priority: string; 
  status: string; 
  dueDate: string | null; 
  startDate?: string | null;
  estimate?: number | null;
  tags: string[];
  order: number; 
  projectId?: string | null;
  parentId: string | null; 
  children: Task[]; 
  createdAt: string;
  closedAt?: string | null;
  attachments?: Attachment[];
  // Dependencies
  blockedBy?: { id: string }[];
  blocks?: { id: string }[];
  // Cross-area request (Capa 3)
  targetAreaId?: string | null;
  requestType?: string | null;
  requesterId?: string | null;
  // Aprobación por líder
  approvalState?: "pending" | "approved" | "rejected" | null;
  submittedAt?: string | null;
  submittedById?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  rejectionNote?: string | null;
  reworkCount?: number;
  // Estancamiento
  lastProgressAt?: string | null;
  holderId?: string | null;
}

export const PRIO_CFG: Record<string, { label: string; bg: string; c: string }> = {
  P0: { label: "Urgente", bg: "var(--fc-danger-wash)", c: "var(--fc-danger)" },
  P1: { label: "Alta", bg: "var(--fc-accent-wash)", c: "var(--fc-accent)" },
  P2: { label: "Media", bg: "rgba(139,141,242,0.15)", c: "var(--fc-module-aria)" },
  P3: { label: "Baja", bg: "rgba(148,163,184,0.1)", c: "var(--fc-text-secondary)" },
};
export const PRIORITIES = Object.keys(PRIO_CFG);
