"use client";

// ============================================================================
// Superficie pública de vistas reutilizables del módulo de Análisis de Resultados.
//
// NO se duplican componentes: cada nombre solicitado es un alias del componente
// que ya implementa esa vista en el módulo global. Así el mismo set de vistas
// sirve tanto al dashboard global como a la sección Proyectos → Análisis de
// Resultados, recibiendo el alcance vía props (`base`/`query`) y/o el contexto
// `useAnalyticsScope()` (scope, projectId, clientId, allowedChannels).
//
//   AnalyticsDashboardShell   → AdvancedAnalyticsDashboard (shell con filtros + tabs)
//   AnalyticsOverview         → TabResumen
//   AnalyticsOperations       → TabOperation
//   AnalyticsConversationsTable → TabConversations
//   AnalyticsAgentsView       → TabAgents
//   AnalyticsCampaignsView    → TabCampaigns
//   AnalyticsServicesView     → TabServices
//   AnalyticsFunnelsView      → TabFunnels
//   AnalyticsBotQualityView   → TabQuality
//   AnalyticsRoiView          → TabRoi
//   AnalyticsDataQualityView  → TabDataQuality
//   AnalyticsAuditLogsView    → TabAudit
// ============================================================================

export { AdvancedAnalyticsDashboard as AnalyticsDashboardShell } from "./AdvancedAnalyticsDashboard";
export type { AdvancedAnalyticsDashboardProps as AnalyticsDashboardShellProps } from "./AdvancedAnalyticsDashboard";

export {
  TabResumen as AnalyticsOverview,
  TabConversations as AnalyticsConversationsTable,
  TabAgents as AnalyticsAgentsView,
  TabCampaigns as AnalyticsCampaignsView,
  TabServices as AnalyticsServicesView,
  TabFunnels as AnalyticsFunnelsView,
  TabDataQuality as AnalyticsDataQualityView,
  TabAudit as AnalyticsAuditLogsView,
} from "./tabs/DataTabs";

export { TabOperation as AnalyticsOperations } from "./tabs/TabOperation";
export { TabQuality as AnalyticsBotQualityView } from "./tabs/TabQuality";
export { TabRoi as AnalyticsRoiView } from "./tabs/TabRoi";

export { useAnalyticsScope, AnalyticsScopeProvider } from "./AnalyticsScopeContext";
export type { AnalyticsScope } from "./AnalyticsScopeContext";
