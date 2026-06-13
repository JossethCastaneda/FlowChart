// ============================================================================
// Acotamiento del módulo "Análisis de Resultados" al ámbito de un PROYECTO.
//
// El modelo normalizado (NormalizedConversation/Message) se aísla por
// `workspaceId`. No existe `projectId` en la conversación normalizada, así que
// el alcance por proyecto se construye con dos dimensiones que SÍ están en el
// modelo real del repo:
//
//   1) PROVEEDORES configurados en el proyecto: Project.crmIntegrationIds (con
//      fallback al legacy crmIntegrationId) → Integration.provider → proveedor
//      normalizado ("botmaker" | "cari_ai"). Si el proyecto no conecta ninguna
//      plataforma analítica (bot), no hay datos que mostrar.
//
//   2) CANALES configurados en el proyecto: derivados de las cuentas sociales
//      vinculadas (Project.whatsapp / instagram / fanpage). Solo aparecen los
//      canales realmente configurados; el resto no es opción ni contamina KPIs.
//
// Este archivo NO importa prisma: es seguro tanto en cliente como en servidor.
// La resolución contra base de datos vive en `project-scope.server.ts`.
// ============================================================================

export interface ProjectScope {
  projectId: string;
  /** Proveedores normalizados habilitados para el proyecto (p. ej. ["botmaker"]). */
  providers: string[];
  /** Canales canónicos configurados (p. ej. ["whatsapp","instagram"]). */
  channels: string[];
}

/**
 * Mapea el `provider` de la integración (cómo se guarda en Integration) al
 * `provider` del modelo normalizado (cómo lo escriben los adapters). Las
 * integraciones CRM de proyecto usan "cari"; las de analítica usan "cari_ai";
 * ambas alimentan el mismo proveedor normalizado.
 */
export const INTEGRATION_TO_NORMALIZED_PROVIDER: Record<string, string> = {
  botmaker: "botmaker",
  cari: "cari_ai",
  cari_ai: "cari_ai",
};

/** Etiquetas legibles para el selector de canal del dashboard. */
export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  webchat: "Web Chat",
};

/** Etiquetas legibles para el selector de plataforma/proveedor. */
export const PROVIDER_LABELS: Record<string, string> = {
  botmaker: "Botmaker",
  cari_ai: "Cari AI",
};

/**
 * Deriva los canales canónicos configurados a partir de las cuentas sociales
 * vinculadas al proyecto. Una Fanpage de Facebook habilita tanto publicaciones
 * (facebook) como mensajería (messenger).
 */
export function deriveProjectChannels(p: {
  whatsapp?: string[] | null;
  instagram?: string[] | null;
  fanpage?: string[] | null;
}): string[] {
  const channels = new Set<string>();
  if (p.whatsapp && p.whatsapp.length > 0) channels.add("whatsapp");
  if (p.instagram && p.instagram.length > 0) channels.add("instagram");
  if (p.fanpage && p.fanpage.length > 0) {
    channels.add("facebook");
    channels.add("messenger");
  }
  return [...channels];
}

/**
 * Mapea los `provider` de un conjunto de integraciones a proveedores
 * normalizados, deduplicando y descartando proveedores sin adaptador analítico.
 */
export function deriveNormalizedProviders(integrationProviders: string[]): string[] {
  const out = new Set<string>();
  for (const p of integrationProviders) {
    const mapped = INTEGRATION_TO_NORMALIZED_PROVIDER[p];
    if (mapped) out.add(mapped);
  }
  return [...out];
}
