export const PLATFORMS = [
  { id: "meta",      name: "Meta Ads",            color: "#0081FB" },
  { id: "google",    name: "Google Ads",           color: "#4285F4" },
  { id: "tiktok",    name: "TikTok Ads",           color: "#45aec2" },
  { id: "whatsapp",  name: "WhatsApp Business",    color: "#25D366" },
];

export const VERTICALS = [
  "E-commerce", "Real Estate", "Fintech", "Health & Wellness", "Education",
  "Food & Beverage", "Automotive", "SaaS / Tech", "Fashion", "Travel",
];

export const GOALS = [
  "Conversaciones", "Clics al sitio", "Seguidores", "Leads",
  "Ventas (Purchase)", "Registros", "Descargas app", "Video views",
  "Alcance (Reach)", "Tráfico a tienda",
];




export const GOOGLE_PLATFORM = "__google__";
export const NO_BOT_PLATFORM = "__none__";

export const CPR_MAP: Record<string, string> = {
  "Conversaciones": "Costo / conversación",
  "Clics al sitio": "CPC", "Seguidores": "Costo / seguidor",
  "Leads": "CPL", "Ventas (Purchase)": "CPA",
  "Registros": "Costo / registro", "Descargas app": "CPI",
  "Video views": "CPV", "Alcance (Reach)": "CPM",
  "Tráfico a tienda": "Costo / visita",
};

export const STATUSES = ["EN VUELO", "EN ÓRBITA", "Draft", "Completado"] as const;

/**
 * Estados en los que un proyecto se considera "activo" para ruteo de eventos y
 * alertas. Incluye el legacy "Activo": el formulario nuevo guarda "EN VUELO"/"EN ÓRBITA",
 * así que filtrar solo por "Activo" saltaba silenciosamente todos los proyectos nuevos.
 */
export const ACTIVE_PROJECT_STATUSES = ["EN VUELO", "EN ÓRBITA", "Activo"] as const;

export const STATUS_COLORS: Record<string, string> = {
  "EN VUELO": "emerald", "EN ÓRBITA": "amber", Draft: "muted", Completado: "cyan",
};
