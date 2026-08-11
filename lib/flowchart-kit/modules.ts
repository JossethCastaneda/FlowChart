/* ════════════════════════════════════════════════════════════
   FLOWCHART · REGISTRO CENTRAL DE MÓDULOS
   Fuente única para nombres, rutas, color de esencia, ícono y voz.
   Modelo de DOS CAPAS:
     · label → lo que ve el marketer en el menú (funcional, obvio)
     · code  → el codename / esencia (color, ícono, lema, voz de Orbi)
   Importa este archivo en el sidebar, breadcrumbs, headers y Orbi.
   ════════════════════════════════════════════════════════════ */

export type ModuleKey =
  | "resumen" | "clientes" | "publicacion" | "inbox" | "anuncios"
  | "escucha" | "envivo" | "briefs" | "tareas" | "chatbots"
  | "integraciones" | "configuracion" | "mmm" | "optimization"
  | "aprobaciones" | "reportes" | "biblioteca" | "datos" | "competidores" | "linkinbio" | "roles" | "api" | "aria";

export type GroupKey =
  | "operacion" | "contenido" | "crecimiento" | "sistema";

export interface SubModule {
  label: string;   // pestaña dentro del módulo
  route: string;   // ruta hija o ancla de tab
}

export interface ModuleDef {
  key: ModuleKey;
  label: string;   // etiqueta del menú (funcional)
  code: string;    // codename / esencia
  route: string;
  color: string;   // var() token de acento
  icon: string;    // nombre lucide
  tagline: string; // lema de la esencia
  group: GroupKey;
  /** Submódulos = pestañas internas, NO entradas del sidebar. */
  tabs?: SubModule[];
}

export const MODULES: ModuleDef[] = [
  // ── OPERACIÓN — el día a día ──
  { key: "resumen",     label: "Resumen",  code: "Pulso",    route: "/dashboard/resumen",  color: "var(--mod-resumen)",  icon: "activity",        tagline: "El latido de tu operación",   group: "operacion" },
  { key: "clientes",    label: "Clientes", code: "Cartera",  route: "/dashboard/proyectos", color: "var(--mod-clientes)", icon: "folder-kanban",  tagline: "Tus cuentas, en órbita",      group: "operacion",
    tabs: [
      { label: "Resumen",                route: "" },
      { label: "Configuración",          route: "/configuracion" },
    ] },
  { key: "inbox",       label: "Inbox",    code: "Señal",    route: "/dashboard/inbox",    color: "var(--mod-inbox)",    icon: "messages-square", tagline: "Cada mensaje, un solo canal", group: "operacion" },
  { key: "tareas",      label: "Tareas",   code: "Misiones", route: "/dashboard/ops",      color: "var(--mod-tareas)",   icon: "target",          tagline: "Cada tarea, una misión",      group: "operacion" },

  // ── CONTENIDO — idear, pedir arte, programar (en ese orden de flujo) ──
  { key: "briefs",      label: "Briefs IA",   code: "Nova",      route: "/dashboard/briefing",  color: "var(--mod-briefs)",   icon: "sparkles", tagline: "La parrilla nace aquí", group: "contenido" },
  { key: "publicacion", label: "Publicación", code: "Lanzadera", route: "/dashboard/publisher", color: "var(--mod-publicar)", icon: "rocket", tagline: "Programa y despega", group: "contenido",
    tabs: [
      { label: "Calendario", route: "" },
      { label: "Historial",  route: "/historial" },
    ] },

  // ── CRECIMIENTO — pauta y monitoreo ──
  { key: "anuncios",    label: "Anuncios",     code: "Impulso",    route: "/dashboard/ads-manager",  color: "var(--mod-anuncios)", icon: "megaphone",   tagline: "Empuje para tus campañas",       group: "crecimiento" },
  { key: "mmm",         label: "Centurion MMM",    code: "Convergencia", route: "/dashboard/centurion",   color: "var(--mod-mmm)",      icon: "pie-chart",   tagline: "Marketing Mix Modeling SaaS",      group: "crecimiento",
    tabs: [
      { label: "Resumen",     route: "" },
      { label: "Datos",       route: "/datos" },
      { label: "Modelo",      route: "/modelo" },
      { label: "Simulador",   route: "/simulador" },
      { label: "Configuración", route: "/config" },
    ] },
  { key: "escucha",     label: "Escucha",      code: "Radar",     route: "/dashboard/listening",    color: "var(--mod-escucha)",  icon: "radar",       tagline: "Escucha todo el espectro",       group: "crecimiento" },
  { key: "envivo",      label: "En vivo",      code: "Órbita",    route: "/dashboard/streams",     color: "var(--mod-envivo)",   icon: "columns-3",  tagline: "Tu feed, en tiempo real",        group: "crecimiento" },
  { key: "aria",        label: "Aria IA",      code: "Oráculo",   route: "/dashboard/crecimiento", color: "var(--mod-aria)",     icon: "brain-circuit", tagline: "Predice tu siguiente venta",    group: "crecimiento",
    tabs: [
      { label: "Insights",         route: "" },
      { label: "Data Hub",         route: "/data-hub" },
      { label: "Predictive Studio", route: "/studio" },
      { label: "Scores",           route: "/scores" },
    ] },
  { key: "optimization", label: "Optimización", code: "Control", route: "/dashboard/optimization", color: "var(--purple)", icon: "gauge", tagline: "Decisiones de inversión gobernadas", group: "crecimiento" },
  { key: "reportes",    label: "Reportes",     code: "Bitácora",  route: "/dashboard/reportes",    color: "var(--mod-reportes)", icon: "file-text",   tagline: "Informes white-label para el cliente", group: "crecimiento" },



  // ── SISTEMA — ajuste, no trabajo diario (pie del sidebar, en gris) ──
  { key: "integraciones", label: "Integraciones", code: "Enlaces", route: "/dashboard/integrations", color: "var(--text-muted)", icon: "plug", tagline: "Conecta tus cuentas", group: "sistema",
    tabs: [
      { label: "Facebook", route: "/facebook" },
      { label: "Meta Ads", route: "/meta-ads" },
      { label: "WhatsApp", route: "/whatsapp" },
    ] },
  { key: "configuracion", label: "Configuración", code: "Consola", route: "/dashboard/settings", color: "var(--text-muted)", icon: "settings", tagline: "Tu cuenta y tu workspace", group: "sistema" },
];

/* NOTA · consolidación:
   - "Métricas de bots" (ex Bot Analytics) ya NO es ítem de menú → pestaña de Chatbots.
   - La ruta /dashboard/gridia se UNIFICA en Briefs IA (/dashboard/briefing). Eliminar el duplicado.
   - /dashboard/historial → pestaña de Publicación.
   - /dashboard/analisis-resultados → vive como pestaña de Anuncios. */

export const MODULE_BY_KEY: Record<ModuleKey, ModuleDef> =
  Object.fromEntries(MODULES.map((m) => [m.key, m])) as Record<ModuleKey, ModuleDef>;

export const GROUP_LABELS: Record<GroupKey, string> = {
  operacion:      "Operación",
  contenido:      "Contenido",
  crecimiento:    "Crecimiento",
  sistema:        "Sistema",
};

/* ════════════════════════════════════════════════════════════
   FUTURE_MODULES — pre-declarados para próximas implementaciones.
   Cada uno YA tiene grupo, color de esencia y patrón asignados,
   para que al construirlo no se invente nada nuevo: se sigue el sistema.
   Priorizado por el scouting competitivo (ver roadmap.md).
   `status` controla la visibilidad: "planned" no se renderiza aún.
   ════════════════════════════════════════════════════════════ */

export type Phase = 1 | 2 | 3;

export interface FutureModuleDef extends ModuleDef {
  status: "planned";
  phase: Phase;
  /** Si es pestaña de un módulo existente en vez de ítem propio. */
  tabOf?: ModuleKey;
}

export const FUTURE_MODULES: FutureModuleDef[] = [
  // ── Fase 1 · cerrar la brecha de agencia ──
  { key: "aprobaciones", label: "Aprobaciones", code: "Visto bueno", route: "/dashboard/aprobaciones", color: "#34b77c", icon: "check-check",  tagline: "Revisión y firma antes de publicar", group: "contenido",   status: "planned", phase: 1 },
  { key: "biblioteca",   label: "Biblioteca",   code: "Bóveda",      route: "/dashboard/publisher/biblioteca", color: "#e0a83c", icon: "folder-open", tagline: "Activos de marca centralizados", group: "contenido", status: "planned", phase: 1, tabOf: "publicacion" },

  // ── Fase 2 · inteligencia & alcance ──
  { key: "datos", label: "Datos", code: "Telescopio", route: "/dashboard/datos", color: "#3898ac", icon: "database", tagline: "Todas tus métricas, una fuente", group: "crecimiento", status: "planned", phase: 2 },
  { key: "competidores", label: "Competidores", code: "Rivales", route: "/dashboard/listening/competidores", color: "#d9822b", icon: "swords", tagline: "Benchmark contra otras marcas", group: "crecimiento", status: "planned", phase: 2, tabOf: "escucha" },
  { key: "linkinbio",    label: "Link-in-bio",  code: "Portal",  route: "/dashboard/portal", color: "#45aec2", icon: "link", tagline: "Mini-landing con métricas de clic", group: "contenido", status: "planned", phase: 2 },
  // Orbi Copilot+ NO es un módulo: es una capa transversal. Ver orbi-states.md.

  // ── Fase 3 · gobernanza & escala (exploratoria) ──
  { key: "roles",  label: "Roles & permisos",   code: "Mando",   route: "/dashboard/settings/roles", color: "var(--text-muted)", icon: "shield",  tagline: "Acceso por rol y por cliente", group: "sistema", status: "planned", phase: 3, tabOf: "configuracion" },
  { key: "api",    label: "API & automatización", code: "Puente", route: "/dashboard/settings/api",  color: "var(--text-muted)", icon: "webhook", tagline: "Webhooks y conectores externos", group: "sistema", status: "planned", phase: 3, tabOf: "configuracion" },
];

/** Acentos reservados para los módulos futuros — NO reutilizar en otra cosa. */
export const RESERVED_ACCENTS: Record<string, string> = {
  datos:        "#3898ac",
  aprobaciones: "#34b77c",
  reportes:     "#45aec2",
  biblioteca:   "#e0a83c",
  competidores: "#d9822b",
  linkinbio:    "#45aec2",
};
