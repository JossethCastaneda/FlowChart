/* ════════════════════════════════════════════════════════════
   SODARE · ÁRBOL DE TAREAS — máquina de estados de solicitudes entre áreas
   Extiende el sistema que Ops/Tareas (✦ Misiones) ya tiene:
   areas, requestTypes (slaHours), assignee, attachments, targetAreaId,
   areaSlaStats. NO crea un sistema paralelo — formaliza los estados.
   Ver Sección 19 del Design System.
   ════════════════════════════════════════════════════════════ */

export type TaskState =
  | "solicitada"     // creada, en cola del área destino, sin asignar
  | "asignada"       // auto-asignada a persona disponible; corre el SLA
  | "en_progreso"    // el ejecutor trabaja y sube archivos
  | "en_aprobacion"  // entregada; el solicitante revisa la vista previa
  | "aprobada"       // OK → archivo descargable, cierra SLA
  | "cancelada";     // terminada sin entrega

/** Quién es el actor que puede mover/operar la tarea en cada estado. */
export type Actor = "solicitante" | "ejecutor" | "lider" | "sistema";

export interface StateDef {
  label: string;            // ES (la EN sale de i18n: t.taskState[state])
  color: string;            // token o hex del anillo
  icon: string;             // lucide
  actor: Actor;             // quién actúa aquí
  can: string[];            // capacidades habilitadas en este estado
  next: TaskState[];        // transiciones permitidas
}

export const TASK_STATES: Record<TaskState, StateDef> = {
  solicitada: {
    label: "Solicitada", color: "#5b9bff", icon: "send", actor: "solicitante",
    can: ["editar_brief", "adjuntar_referencias", "cancelar"],
    next: ["asignada", "cancelada"],
  },
  asignada: {
    label: "Asignada", color: "#8b8df2", icon: "user-check", actor: "sistema",
    can: ["reasignar_lider", "iniciar"],
    next: ["en_progreso", "cancelada"],
  },
  en_progreso: {
    label: "En progreso", color: "#e0a83c", icon: "loader", actor: "ejecutor",
    can: ["subir_archivos", "subir_version", "comentar", "enviar_a_aprobacion"],
    next: ["en_aprobacion", "cancelada"],
  },
  en_aprobacion: {
    label: "En aprobación", color: "#d98843", icon: "eye", actor: "solicitante",
    can: ["ver_preview", "aprobar", "pedir_cambios", "comentar"],
    next: ["aprobada", "en_progreso"], // pedir_cambios → vuelve a en_progreso
  },
  aprobada: {
    label: "Aprobada", color: "#34b77c", icon: "check-check", actor: "solicitante",
    can: ["descargar", "ver_preview", "enviar_a_biblioteca", "vincular_a_post"],
    next: [], // terminal
  },
  cancelada: {
    label: "Cancelada", color: "var(--text-muted)", icon: "x", actor: "lider",
    can: ["reabrir"],
    next: ["solicitada"],
  },
};

/** Transición válida? */
export function canTransition(from: TaskState, to: TaskState): boolean {
  return TASK_STATES[from]?.next.includes(to) ?? false;
}

/* ── Asignación por disponibilidad ──────────────────────────────
   "Persona disponible" = miembro activo del área destino con MENOR
   carga abierta (tareas no terminales). Empate → round-robin por
   última asignación. Ausentes (sin disponibilidad) se excluyen.     */

export interface AreaMember {
  id: string;
  name: string;
  available: boolean;     // no ausente / con cupo
  openTasks: number;      // tareas en estado no terminal
  lastAssignedAt?: number;
}

export function pickAssignee(members: AreaMember[]): AreaMember | null {
  const pool = members.filter((m) => m.available);
  if (pool.length === 0) return null;
  return pool.sort((a, b) =>
    a.openTasks !== b.openTasks
      ? a.openTasks - b.openTasks                          // menor carga primero
      : (a.lastAssignedAt ?? 0) - (b.lastAssignedAt ?? 0)  // luego round-robin
  )[0];
}

/* ── Salud del área (rezago / saturación) ───────────────────────
   Reutiliza el areaSlaStats que Ops ya calcula. Umbrales: */

export type AreaHealth = "sana" | "en_riesgo" | "rezagada";

export function areaHealth(slaPct: number): AreaHealth {
  if (slaPct >= 95) return "sana";
  if (slaPct >= 80) return "en_riesgo";
  return "rezagada";
}

/** ¿Persona saturada? Para sugerencias de Orbi (reasignar / repriorizar). */
export function isOverloaded(openTasks: number, teamAvg: number): boolean {
  return openTasks >= 7 || openTasks > teamAvg * 1.8;
}

export const HEALTH_COLOR: Record<AreaHealth, string> = {
  sana:      "#34b77c",
  en_riesgo: "#e0a83c",
  rezagada:  "#e5484d",
};

/* ════════════════════════════════════════════════════════════
   MAPA DE SOLICITUDES ENTRE ÁREAS (Sección 20)
   Qué entregables puede pedir cada área a cada otra. Las claves son
   los ids de área del workflow-config (paid, design, comms, strategy,
   community). Los valores son ids de requestType de la área DESTINO.
   Vacío = flujo no habitual.
   ════════════════════════════════════════════════════════════ */

export type AreaId = "paid" | "design" | "comms" | "strategy" | "community";

// from → { to: [requestTypeIds permitidos] }
export const REQUEST_MATRIX: Record<AreaId, Partial<Record<AreaId, string[]>>> = {
  paid: {
    design:   ["static", "carousel", "reel"],
    comms:    ["copy"],
    strategy: ["brief", "report"],
  },
  design: {
    comms:    ["copy"],          // copy final para el arte
    strategy: ["brief"],         // lineamiento antes de diseñar
  },
  comms: {
    design:   ["static"],        // referencia visual
    strategy: ["brief"],
  },
  strategy: {
    paid:      ["optimization"], // datos / ajuste de performance para el reporte
    design:    ["static"],       // gráficos de reporte
    community: ["moderation"],   // insights de escucha
  },
  community: {
    design:   ["static"],        // visual de respuesta
    comms:    ["copy"],          // copy de respuesta
    strategy: ["brief"],         // protocolo de crisis
  },
};

/** ¿Puede `from` pedir `type` a `to`? */
export function canRequest(from: AreaId, to: AreaId, requestTypeId: string): boolean {
  if (from === to) return false; // mismo área = trabajo interno, no "solicitud"
  return REQUEST_MATRIX[from]?.[to]?.includes(requestTypeId) ?? false;
}

/* ── Cadenas (ramificaciones) ───────────────────────────────────
   Una plantilla crea varias tareas de golpe con sus dependencias.
   `dependsOn` apunta a `ref`s anteriores; mientras no estén "aprobada",
   la tarea queda "bloqueada" (no entra a cola ni corre SLA).
   `needsAll` = convergencia (espera TODAS sus dependencias).          */

export interface ChainStep {
  ref: string;            // id local dentro de la cadena
  area: AreaId;           // área destino
  requestType: string;   // requestType de esa área
  dependsOn?: string[];  // refs que deben estar aprobadas antes
  needsAll?: boolean;     // true = convergencia (todas); default any/none
}

export interface ChainTemplate {
  id: string;
  name: string;
  steps: ChainStep[];
}

export const CHAIN_TEMPLATES: ChainTemplate[] = [
  {
    id: "lanzar_campana",
    name: "Lanzar campaña",
    steps: [
      { ref: "brief",     area: "strategy",  requestType: "brief" },
      { ref: "copy",      area: "comms",     requestType: "copy",   dependsOn: ["brief"] },
      { ref: "creativo",  area: "design",    requestType: "reel",   dependsOn: ["copy"] },   // bloqueada hasta el copy
      { ref: "setup",     area: "paid",      requestType: "setup",  dependsOn: ["copy", "creativo"], needsAll: true }, // convergencia
      { ref: "moderacion",area: "community", requestType: "moderation", dependsOn: ["setup"] },
      { ref: "reporte",   area: "strategy",  requestType: "report", dependsOn: ["setup"] },
    ],
  },
];

/** Refs cuyas dependencias ya están todas aprobadas → listas para disparar. */
export function readySteps(template: ChainTemplate, approvedRefs: Set<string>): ChainStep[] {
  return template.steps.filter((s) => {
    if (approvedRefs.has(s.ref)) return false;            // ya hecha
    const deps = s.dependsOn ?? [];
    if (deps.length === 0) return true;                   // raíz
    return deps.every((d) => approvedRefs.has(d));        // any/all → con dependsOn explícito basta "todas"
  });
}
