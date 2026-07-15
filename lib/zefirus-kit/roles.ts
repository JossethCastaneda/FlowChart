/* ════════════════════════════════════════════════════════════
   ZEFIRUS · PUESTOS, ROLES Y RESPONSABILIDADES POR ÁREA
   Taxonomía de la agencia de marketing digital. Es la base del
   ruteo AUTOMÁTICO SIN IA: una solicitud de tipo X se asigna a la
   persona disponible cuyo PUESTO sabe ejecutar X (menor carga), y
   la aprueba el líder del área. Todo determinista, por reglas.

   Más adelante, la capa de IA (catálogo + precios) podrá sugerir
   asignaciones y prioridades sobre esta misma estructura.
   Ids de área alineados con workflow-config (SUGGESTED_AREAS).
   ════════════════════════════════════════════════════════════ */

export type Seniority = "lead" | "senior" | "mid" | "junior";

export interface Position {
  id: string;
  title: string;          // ES (EN vía i18n: t.positions[id])
  area: string;           // id de área
  seniority: Seniority;
  approves: boolean;      // ¿puede aprobar/cerrar entregas del área?
  executes: string[];     // requestType ids que sabe ejecutar
  responsibilities: string[];
}

/* ── 5 ÁREAS ACTIVAS (seed de workflow-config) ─────────────────── */

export const POSITIONS: Position[] = [
  /* ── PAID MEDIA · pauta / performance ── */
  { id: "paid_lead", title: "Director de Paid Media", area: "paid", seniority: "lead", approves: true,
    executes: ["setup", "optimization"],
    responsibilities: ["Estrategia de inversión y mezcla de canales", "Aprobación de presupuestos y escalamientos", "Optimización macro y reglas de cuenta", "Responsable del SLA del área"] },
  { id: "paid_trafficker", title: "Trafficker / Especialista en Paid", area: "paid", seniority: "senior", approves: false,
    executes: ["setup", "optimization"],
    responsibilities: ["Montaje de campañas Meta / Google", "Segmentación, públicos y pujas", "Pruebas A/B de creativos y copy", "Monitoreo diario de pacing"] },
  { id: "paid_analyst", title: "Analista de Performance", area: "paid", seniority: "mid", approves: false,
    executes: ["optimization"],
    responsibilities: ["Lectura de métricas (ROAS, CPA, CPM)", "Alertas de fatiga creativa", "Apoyo a reportes de resultados"] },

  /* ── DISEÑO · creativo ── */
  { id: "design_lead", title: "Director de Arte", area: "design", seniority: "lead", approves: true,
    executes: ["static", "carousel", "reel"],
    responsibilities: ["Lineamiento visual y consistencia de marca", "Revisión y visto bueno final", "Dirección creativa de campañas"] },
  { id: "design_senior", title: "Diseñador Gráfico Sr", area: "design", seniority: "senior", approves: false,
    executes: ["static", "carousel"],
    responsibilities: ["Piezas estáticas y carruseles", "Sistemas visuales y plantillas", "Adaptaciones por formato y canal"] },
  { id: "design_motion", title: "Motion / Editor de Video", area: "design", seniority: "senior", approves: false,
    executes: ["reel"],
    responsibilities: ["Reels, video y GIF", "Animación y motion graphics", "Edición, subtítulos y exportación por canal"] },

  /* ── COMUNICACIÓN · contenido / copy ── */
  { id: "comms_lead", title: "Editor en Jefe / Lead de Contenido", area: "comms", seniority: "lead", approves: true,
    executes: ["copy", "script"],
    responsibilities: ["Tono y voz de marca", "Revisión editorial y ortográfica", "Aprobación de copy antes de publicar"] },
  { id: "comms_copy", title: "Copywriter", area: "comms", seniority: "mid", approves: false,
    executes: ["copy"],
    responsibilities: ["Captions y copy de anuncios", "Microcopy y CTAs", "Adaptación de mensaje por audiencia"] },
  { id: "comms_script", title: "Guionista", area: "comms", seniority: "mid", approves: false,
    executes: ["script"],
    responsibilities: ["Guiones de reel y video", "Estructura narrativa y hooks", "Coordinación con Diseño/Motion"] },

  /* ── ESTRATEGIA · planeación / datos ── */
  { id: "strategy_lead", title: "Director de Estrategia", area: "strategy", seniority: "lead", approves: true,
    executes: ["brief", "report"],
    responsibilities: ["Visión y OKRs por cuenta", "Aprobación de briefs y planes", "Relación estratégica con el cliente"] },
  { id: "strategy_planner", title: "Planner / Estratega", area: "strategy", seniority: "senior", approves: false,
    executes: ["brief"],
    responsibilities: ["Briefs creativos y de campaña", "Calendarios y planes de contenido", "Definición de audiencias y mensajes"] },
  { id: "strategy_analyst", title: "Analista de Datos / Insights", area: "strategy", seniority: "mid", approves: false,
    executes: ["report"],
    responsibilities: ["Reportes y dashboards", "Insights de social listening", "Benchmark de competidores"] },

  /* ── COMMUNITY · gestión de comunidad ── */
  { id: "community_lead", title: "Community Lead", area: "community", seniority: "lead", approves: true,
    executes: ["moderation"],
    responsibilities: ["Protocolo de crisis y escalamiento", "Supervisión de tono en respuestas", "Reporte de incidencias"] },
  { id: "community_cm", title: "Community Manager", area: "community", seniority: "mid", approves: false,
    executes: ["moderation"],
    responsibilities: ["Moderación y respuesta a mensajes", "Atención y derivación de leads", "Publicación y seguimiento en tiempo real"] },
  { id: "community_listening", title: "Analista de Social Listening", area: "community", seniority: "junior", approves: false,
    executes: [],
    responsibilities: ["Monitoreo de menciones y hashtags", "Lectura de sentiment", "Alertas tempranas de crisis"] },
];

/* ── ÁREAS AMPLIABLES (sugeridas, no activas aún) ───────────────
   Para cubrir todos los tipos de marketing digital. Se activan
   agregándolas a workflow-config con sus requestTypes.            */

export const EXPANSION_POSITIONS: Position[] = [
  // SEO / Web
  { id: "seo_lead", title: "SEO Lead", area: "seo", seniority: "lead", approves: true, executes: ["audit", "onpage"],
    responsibilities: ["Estrategia SEO y keywords", "Aprobación de cambios on-page", "Reporte de posicionamiento"] },
  { id: "seo_specialist", title: "Especialista SEO", area: "seo", seniority: "senior", approves: false, executes: ["audit", "onpage"],
    responsibilities: ["Auditorías técnicas", "Optimización on-page", "Link building"] },
  { id: "web_dev", title: "Desarrollador Web", area: "seo", seniority: "senior", approves: false, executes: ["onpage"],
    responsibilities: ["SEO técnico y velocidad", "Implementación de cambios en sitio", "Schema y datos estructurados"] },
  // CRM / Email
  { id: "crm_manager", title: "CRM Manager", area: "crm", seniority: "lead", approves: true, executes: ["email", "automation", "segment"],
    responsibilities: ["Estrategia de retención y ciclo de vida", "Segmentación de base", "Aprobación de envíos"] },
  { id: "email_specialist", title: "Email Marketing Specialist", area: "crm", seniority: "mid", approves: false, executes: ["email", "automation"],
    responsibilities: ["Diseño y armado de campañas de email", "Flujos de automatización", "Pruebas A/B de asuntos"] },
  // Cuentas (interfaz con cliente)
  { id: "account_manager", title: "Ejecutivo de Cuenta", area: "accounts", seniority: "senior", approves: true, executes: [],
    responsibilities: ["Relación y comunicación con el cliente", "Levanta solicitudes en nombre del cliente", "Seguimiento de entregas y aprobaciones"] },
];

/* ── RUTEO AUTOMÁTICO (sin IA) ──────────────────────────────────
   1) requestType → puestos que lo ejecutan (filtrando por área destino)
   2) entre esos, elegir persona disponible de menor carga (pickAssignee)
   3) aprueba el puesto con approves=true del área (el líder)            */

const ALL_POSITIONS = [...POSITIONS, ...EXPANSION_POSITIONS];

export function positionsByArea(areaId: string): Position[] {
  return ALL_POSITIONS.filter((p) => p.area === areaId);
}

/** Puestos del área destino capaces de ejecutar ese requestType. */
export function executorsFor(areaId: string, requestTypeId: string): Position[] {
  return ALL_POSITIONS.filter((p) => p.area === areaId && p.executes.includes(requestTypeId));
}

/** El puesto que aprueba en un área (líder). */
export function approverOf(areaId: string): Position | null {
  return ALL_POSITIONS.find((p) => p.area === areaId && p.approves) ?? null;
}
