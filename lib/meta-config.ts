/**
 * lib/meta-config.ts — Fuente ÚNICA de los `config_id` de Meta por módulo.
 *
 * Cada sección conecta sus activos con su propio `config_id` de "Facebook Login for
 * Business" (scopes mínimos por módulo — ver lib/meta-scopes.ts). Este archivo resuelve
 * qué variable de entorno provee ese config_id.
 *
 * ── Nomenclatura (AGENTS.md → PLATAFORMA_FUNCION_MODULO) ──────────────────────────
 * Los config_id de INTEGRACIONES pertenecen a la app **META** (no a la app de Login,
 * ver AGENTS.md §"Separación de Apps de Meta"), por eso el prefijo `META_CONFIG_*`.
 * El config_id de **Login** pertenece a la app **FACEBOOK** → `FACEBOOK_CONFIG_AUTH`.
 *
 * Cada resolución lee el NOMBRE NUEVO (convención) y cae al NOMBRE LEGACY si el nuevo no
 * está definido, para poder migrar los envs en Vercel sin romper el despliegue actual.
 * Basta con dejar UNO de los dos configurado.
 */

export interface MetaModuleConfig {
  /** Nombre de la variable en la convención vigente (PLATAFORMA_FUNCION_MODULO). */
  current: string;
  /** Nombre legacy que aún se acepta como fallback. */
  legacy: string;
  /** Etiqueta legible del módulo (para mensajes de error/health). */
  label: string;
}

/** Módulo de conexión Meta → variables de su config_id. */
export const META_MODULE_CONFIG: Record<string, MetaModuleConfig> = {
  publisher_facebook: { current: "META_CONFIG_PUBLISHERFB", legacy: "FACEBOOK_PUBLISHER_FB_CONFIG_ID", label: "Publisher Facebook" },
  publisher_instagram: { current: "META_LOGIN_INSTAGRAM", legacy: "FACEBOOK_PUBLISHER_IG_CONFIG_ID", label: "Publisher Instagram" },
  social: { current: "META_CONFIG_SOCIAL", legacy: "FACEBOOK_SOCIAL_CONFIG_ID", label: "Social Channels" },
  ads: { current: "META_CONFIG_ADS", legacy: "FACEBOOK_ADS_CONFIG_ID", label: "Meta Ads Manager" },
  analytics: { current: "META_CONFIG_ANALYTICS", legacy: "FACEBOOK_ANALYTICS_CONFIG_ID", label: "Analytics Engine" },
  community: { current: "META_CONFIG_INBOX", legacy: "MESSENGER_CONFIG_ID", label: "Community / Inbox" },
};

/** Login (app FACEBOOK, solo identidad). */
export const LOGIN_CONFIG = { current: "FACEBOOK_CONFIG_AUTH", legacy: "FACEBOOK_LOGIN_CONFIG_ID", label: "Login (identidad)" } as const;

/** Devuelve el config_id resuelto para un módulo (nuevo → legacy), o null si el módulo no existe. */
export function resolveModuleConfig(module: string): { configId: string; label: string; expectedEnv: string } | null {
  const entry = META_MODULE_CONFIG[module];
  if (!entry) return null;
  const configId = (process.env[entry.current] || process.env[entry.legacy] || "").trim();
  return { configId, label: entry.label, expectedEnv: entry.current };
}

/** config_id del flujo de Login con Facebook (identidad). "" si no está configurado. */
export function resolveLoginConfigId(): string {
  return (process.env[LOGIN_CONFIG.current] || process.env[LOGIN_CONFIG.legacy] || "").trim();
}

/** Lista de módulos Meta conectables (para validación de rutas). */
export const META_MODULES = Object.keys(META_MODULE_CONFIG);
