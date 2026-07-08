export interface Member { 
  id: string; 
  name: string; 
  email: string | null; 
  image: string | null; 
  role: string; 
  activityStatus?: string 
}

export interface Attachment { 
  name: string; 
  url: string; 
  type: string; 
  size: number; 
  uploadedAt: string 
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
}

export const PRIO_CFG: Record<string, { label: string; bg: string; c: string }> = {
  P0: { label: "Urgente", bg: "var(--red-dim)", c: "var(--red)" },
  P1: { label: "Alta", bg: "var(--cyan-dim)", c: "var(--cyan)" },
  P2: { label: "Media", bg: "rgba(139,141,242,0.15)", c: "var(--purple)" },
  P3: { label: "Baja", bg: "rgba(148,163,184,0.1)", c: "var(--text-secondary)" },
};
export const PRIORITIES = Object.keys(PRIO_CFG);
