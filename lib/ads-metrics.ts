/**
 * Ads Manager — Calculated Metrics Library
 * Métricas calculadas por Sodare (no nativas de Meta)
 */

// ── Meta Objective mapping ──────────────────────────────────────────────────
export const OBJECTIVE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  OUTCOME_AWARENESS:     { label: "Awareness",      icon: "📡", color: "#22d3ee" },
  OUTCOME_TRAFFIC:       { label: "Tráfico",         icon: "🔗", color: "#60a5fa" },
  OUTCOME_ENGAGEMENT:    { label: "Interacción",     icon: "💬", color: "#a78bfa" },
  OUTCOME_LEADS:         { label: "Leads",           icon: "📋", color: "#34d399" },
  OUTCOME_APP_PROMOTION: { label: "App Promotion",   icon: "📱", color: "#fb923c" },
  OUTCOME_SALES:         { label: "Ventas",          icon: "🛒", color: "#f472b6" },
  // Legacy objectives (still returned by API for old campaigns)
  BRAND_AWARENESS:       { label: "Awareness",      icon: "📡", color: "#22d3ee" },
  REACH:                 { label: "Alcance",         icon: "📡", color: "#22d3ee" },
  LINK_CLICKS:           { label: "Tráfico",         icon: "🔗", color: "#60a5fa" },
  POST_ENGAGEMENT:       { label: "Interacción",     icon: "💬", color: "#a78bfa" },
  LEAD_GENERATION:       { label: "Leads",           icon: "📋", color: "#34d399" },
  CONVERSIONS:           { label: "Conversiones",    icon: "🛒", color: "#f472b6" },
  MESSAGES:              { label: "Mensajes",        icon: "✉️", color: "#818cf8" },
  VIDEO_VIEWS:           { label: "Video Views",     icon: "🎬", color: "#fb923c" },
};

// ── Star Wars Status Vocabulary ─────────────────────────────────────────────
export const SW_STATUS: Record<string, { label: string; color: string; glow: string }> = {
  ACTIVE:        { label: "EN VUELO",              color: "#34d399", glow: "rgba(52,211,153,0.3)" },
  PAUSED:        { label: "EN ÓRBITA",             color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  DELETED:       { label: "DESTRUIDO",             color: "#ef4444", glow: "rgba(239,68,68,0.3)" },
  ARCHIVED:      { label: "ARCHIVADO",             color: "#6b7280", glow: "rgba(107,114,128,0.3)" },
  DRAFT:         { label: "EN HANGAR",             color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  // effective_status values
  CAMPAIGN_PAUSED:     { label: "NAVE NODRIZA EN ÓRBITA", color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  ADSET_PAUSED:        { label: "ESCUADRÓN EN ÓRBITA",    color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  NOT_DELIVERING:      { label: "SEÑAL PERDIDA",          color: "#6b7280", glow: "rgba(107,114,128,0.3)" },
  IN_PROCESS:          { label: "INICIANDO MOTORES",      color: "#22d3ee", glow: "rgba(34,211,238,0.3)" },
  WITH_ISSUES:         { label: "INTERCEPTADO",           color: "#ef4444", glow: "rgba(239,68,68,0.3)" },
};

// ── Learning Phase Labels ───────────────────────────────────────────────────
export type LearningPhaseStatus = "LEARNING" | "SUCCESS" | "FAIL" | "LEARNING_LIMITED" | "";
export const LEARNING_PHASE_MAP: Record<string, { label: string; color: string; swLabel: string }> = {
  LEARNING:          { label: "Aprendizaje",  color: "#22d3ee", swLabel: "CALIBRANDO SENSORES" },
  SUCCESS:           { label: "Activa",       color: "#34d399", swLabel: "SISTEMAS OPERATIVOS" },
  FAIL:              { label: "Fallida",      color: "#ef4444", swLabel: "SISTEMAS DAÑADOS" },
  LEARNING_LIMITED:  { label: "Limitada",     color: "#fbbf24", swLabel: "POTENCIA REDUCIDA" },
};

// ── Extract action value from Meta actions array ────────────────────────────
export function findActionValue(actions: any[], actionType: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const action = actions.find((a: any) => a.action_type === actionType);
  return action ? parseFloat(action.value || "0") : 0;
}

export function findActionCost(costPerAction: any[], actionType: string): number {
  if (!costPerAction || !Array.isArray(costPerAction)) return 0;
  const item = costPerAction.find((a: any) => a.action_type === actionType);
  return item ? parseFloat(item.value || "0") : 0;
}

// ── ROAS ────────────────────────────────────────────────────────────────────
/** Calculate ROAS from purchase_roas array or action_values/spend */
export function calcROAS(ins: any): number {
  // Method 1: Meta's purchase_roas field
  if (ins.purchase_roas && Array.isArray(ins.purchase_roas) && ins.purchase_roas.length > 0) {
    return parseFloat(ins.purchase_roas[0]?.value || "0");
  }
  // Method 2: action_values purchase / spend
  if (ins.action_values && ins.spend > 0) {
    const purchaseValue = findActionValue(ins.action_values, "omni_purchase");
    if (purchaseValue > 0) return purchaseValue / ins.spend;
    const purchaseValue2 = findActionValue(ins.action_values, "purchase");
    if (purchaseValue2 > 0) return purchaseValue2 / ins.spend;
  }
  return 0;
}

// ── CPA / CPL (dynamic by objective) ────────────────────────────────────────
export function calcCPA(ins: any, objective?: string): { value: number; label: string } {
  const spend = ins.spend || 0;
  if (spend === 0) return { value: 0, label: "CPA" };

  // Try different action types based on objective
  const actionTypes = [
    { type: "lead", label: "CPL" },
    { type: "omni_purchase", label: "CPA" },
    { type: "purchase", label: "CPA" },
    { type: "complete_registration", label: "CPR" },
    { type: "add_to_cart", label: "CPATC" },
    { type: "onsite_conversion.messaging_conversation_started_7d", label: "CPConv" },
  ];

  for (const at of actionTypes) {
    const count = findActionValue(ins.actions, at.type);
    if (count > 0) return { value: spend / count, label: at.label };
  }

  // Fallback: use cost_per_action_type if available
  if (ins.cost_per_action_type && ins.cost_per_action_type.length > 0) {
    const first = ins.cost_per_action_type[0];
    return { value: parseFloat(first.value || "0"), label: "CPA" };
  }

  return { value: 0, label: "CPA" };
}

// ── Hook Rate (video campaigns) ─────────────────────────────────────────────
/** Hook Rate = 3-second video views / impressions × 100 */
export function calcHookRate(ins: any): number {
  const impressions = ins.impressions || 0;
  if (impressions === 0) return 0;
  // video_p25_watched_actions is the closest to "3-second views"
  const video3s = findActionValue(ins.video_p25_watched_actions || ins.actions, "video_view");
  if (video3s > 0) return (video3s / impressions) * 100;
  return 0;
}

// ── Landing Page Views ──────────────────────────────────────────────────────
export function calcLandingPageViews(ins: any): number {
  return findActionValue(ins.actions, "landing_page_view");
}

// ── Break-even ROAS ─────────────────────────────────────────────────────────
export function breakEvenROAS(margin: number): number {
  if (margin <= 0 || margin > 1) return 0;
  return 1 / margin;
}

// ── Quality Visit Rate ──────────────────────────────────────────────────────
export function qualityVisitRate(lpv: number, clicks: number): number {
  if (clicks === 0) return 0;
  return (lpv / clicks) * 100;
}

// ── Creative Fatigue Score ──────────────────────────────────────────────────
/** Higher = more fatigued. freq * (1 - ctrNow/ctrWeek1) */
export function creativeFatigueScore(freq: number, ctrNow: number, ctrWeek1: number): number {
  if (ctrWeek1 <= 0) return 0;
  return Math.max(0, freq * (1 - ctrNow / ctrWeek1)) * 100;
}

// ── Frequency Alert Level ───────────────────────────────────────────────────
export function frequencyAlertLevel(freq: number): "none" | "warning" | "critical" {
  if (freq >= 5) return "critical";
  if (freq >= 3) return "warning";
  return "none";
}

// ── Advantage+ Detection ────────────────────────────────────────────────────
export function isAdvantagePlus(row: any): boolean {
  return (
    row.buying_type === "AUCTION" && row.smart_promotion_type === "SMART_APP_PROMOTION"
  ) || row.buying_type === "RESERVED" || !!row.smart_promotion_type;
}

// ── Stardate formatter ──────────────────────────────────────────────────────
export function toStardate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const hours = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  return `Stardate ${year}.${dayOfYear.toString().padStart(3, "0")} — ${hours}:${mins} hrs`;
}

// ── Number formatters ───────────────────────────────────────────────────────
export function fmt$(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function fmtNum(value: number): string {
  return new Intl.NumberFormat("es-MX").format(Math.round(value));
}

export function fmtROAS(value: number): string {
  if (value === 0) return "—";
  return `${value.toFixed(2)}x`;
}
