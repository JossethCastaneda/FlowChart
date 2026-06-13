"use client";

import React, { createContext, useContext } from "react";

/**
 * Contexto de alcance del dashboard de analítica. Permite que cualquier vista
 * (Overview, Conversaciones, etc.) sepa si se está renderizando en modo global
 * o acotada a un proyecto, sin pasar props por toda la jerarquía.
 *
 *   scope = "global"  → módulo global (todo el workspace)
 *   scope = "project" → Proyectos → Análisis de Resultados (acotado)
 */
export interface AnalyticsScope {
  scope: "global" | "project";
  projectId?: string;
  /** En este repo el cliente es un campo string del proyecto (no entidad). */
  clientId?: string | null;
  /** Canales canónicos configurados (solo en modo proyecto). */
  allowedChannels?: string[];
  /** Proveedores normalizados configurados (solo en modo proyecto). */
  allowedProviders?: string[];
  /** Base de la API a consumir: `/api/analytics` o `/api/projects/<id>/analytics`. */
  base: string;
}

const AnalyticsScopeContext = createContext<AnalyticsScope>({
  scope: "global",
  base: "/api/analytics",
});

export function AnalyticsScopeProvider({ value, children }: { value: AnalyticsScope; children: React.ReactNode }) {
  return <AnalyticsScopeContext.Provider value={value}>{children}</AnalyticsScopeContext.Provider>;
}

export function useAnalyticsScope(): AnalyticsScope {
  return useContext(AnalyticsScopeContext);
}
