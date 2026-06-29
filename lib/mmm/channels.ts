/**
 * SODARE · MMM — Canales reales (no demo)
 *
 * El set por defecto refleja las plataformas de medios pagados que el producto
 * sabe conectar (ver app/dashboard/proyectos PLATFORMS): Meta, Google y TikTok.
 * NO incluye canales ficticios como "Email Mktg". Los parámetros de adstock /
 * saturación son puntos de partida razonables que el usuario calibra (o que la
 * auto-calibración ajusta) sobre los datos reales del cliente.
 */

import type { ChannelConfig, MmmClient } from "./types";

export const REAL_DEFAULT_CHANNELS: ChannelConfig[] = [
  { id: "meta",   name: "Meta Ads",   color: "#1877F2", adstockDecay: 0.6, saturationAlpha: 0.8, saturationK: 8000, enabled: true },
  { id: "google", name: "Google Ads", color: "#34A853", adstockDecay: 0.4, saturationAlpha: 0.7, saturationK: 6000, enabled: true },
  { id: "tiktok", name: "TikTok Ads", color: "#69C9D0", adstockDecay: 0.3, saturationAlpha: 0.9, saturationK: 4000, enabled: false },
];

/** Forma mínima de un proyecto que necesitamos para derivar clientes. */
export interface ProjectLike {
  client?: string | null;
  vertical?: string | null;
}

/**
 * Deriva la lista de clientes reales a partir de los proyectos del workspace.
 * Agrupa por `client`, toma la vertical más reciente no vacía y cuenta proyectos.
 * Los proyectos sin cliente se ignoran (no hay anunciante que modelar).
 */
export function clientsFromProjects(projects: ProjectLike[]): MmmClient[] {
  const byClient = new Map<string, MmmClient>();
  for (const p of projects) {
    const name = (p.client ?? "").trim();
    if (!name) continue;
    const existing = byClient.get(name);
    if (existing) {
      existing.projectCount += 1;
      if (!existing.vertical && p.vertical) existing.vertical = p.vertical.trim() || null;
    } else {
      byClient.set(name, { name, vertical: (p.vertical ?? "").trim() || null, projectCount: 1 });
    }
  }
  return Array.from(byClient.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Verticales únicas presentes entre los clientes (para el filtro superior). */
export function verticalsFromClients(clients: MmmClient[]): string[] {
  const set = new Set<string>();
  for (const c of clients) if (c.vertical) set.add(c.vertical);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}
