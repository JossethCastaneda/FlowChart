/**
 * Ads Manager — Calculated Metrics Library
 * Métricas calculadas por Zefirus (no nativas de Meta)
 */

// ── Meta Objective mapping ──────────────────────────────────────────────────
export const OBJECTIVE_MAP: Record<string, { label: string; icon: string; color: string }> = {
  OUTCOME_AWARENESS:     { label: "Awareness",      icon: "", color: "#5b9bff" },
  OUTCOME_TRAFFIC:       { label: "Tráfico",         icon: "", color: "#60a5fa" },
  OUTCOME_ENGAGEMENT:    { label: "Interacción",     icon: "", color: "#a78bfa" },
  OUTCOME_LEADS:         { label: "Leads",           icon: "", color: "#34d399" },
  OUTCOME_APP_PROMOTION: { label: "App Promotion",   icon: "", color: "#d98843" },
  OUTCOME_SALES:         { label: "Ventas",          icon: "", color: "#bc5fb2" },
  // Legacy objectives (still returned by API for old campaigns)
  BRAND_AWARENESS:       { label: "Awareness",      icon: "", color: "#5b9bff" },
  REACH:                 { label: "Alcance",         icon: "", color: "#5b9bff" },
  LINK_CLICKS:           { label: "Tráfico",         icon: "", color: "#60a5fa" },
  POST_ENGAGEMENT:       { label: "Interacción",     icon: "", color: "#a78bfa" },
  LEAD_GENERATION:       { label: "Leads",           icon: "", color: "#34d399" },
  CONVERSIONS:           { label: "Conversiones",    icon: "", color: "#bc5fb2" },
  MESSAGES:              { label: "Mensajes",        icon: "️", color: "#818cf8" },
  VIDEO_VIEWS:           { label: "Video Views",     icon: "", color: "#d98843" },
};

// ── Star Wars Status Vocabulary ─────────────────────────────────────────────
export const SW_STATUS: Record<string, { label: string; color: string; glow: string }> = {
  ACTIVE:        { label: "EN VUELO",              color: "#34d399", glow: "rgba(52,211,153,0.3)" },
  PAUSED:        { label: "EN ÓRBITA",             color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  DELETED:       { label: "DESTRUIDO",             color: "#e5484d", glow: "rgba(229,72,77,0.3)" },
  ARCHIVED:      { label: "ARCHIVADO",             color: "#6b7280", glow: "rgba(107,114,128,0.3)" },
  DRAFT:         { label: "EN HANGAR",             color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  // effective_status values
  CAMPAIGN_PAUSED:     { label: "NAVE NODRIZA EN ÓRBITA", color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  ADSET_PAUSED:        { label: "ESCUADRÓN EN ÓRBITA",    color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
  NOT_DELIVERING:      { label: "SEÑAL PERDIDA",          color: "#6b7280", glow: "rgba(107,114,128,0.3)" },
  IN_PROCESS:          { label: "INICIANDO MOTORES",      color: "#5b9bff", glow: "rgba(91,155,255,0.3)" },
  WITH_ISSUES:         { label: "INTERCEPTADO",           color: "#e5484d", glow: "rgba(229,72,77,0.3)" },
};

// ── Learning Phase Labels ───────────────────────────────────────────────────
export type LearningPhaseStatus = "LEARNING" | "SUCCESS" | "FAIL" | "LEARNING_LIMITED" | "";
export const LEARNING_PHASE_MAP: Record<string, { label: string; color: string; swLabel: string }> = {
  LEARNING:          { label: "Aprendizaje",  color: "#5b9bff", swLabel: "CALIBRANDO SENSORES" },
  SUCCESS:           { label: "Activa",       color: "#34d399", swLabel: "SISTEMAS OPERATIVOS" },
  FAIL:              { label: "Fallida",      color: "#e5484d", swLabel: "SISTEMAS DAÑADOS" },
  LEARNING_LIMITED:  { label: "Limitada",     color: "#fbbf24", swLabel: "POTENCIA REDUCIDA" },
};

// ── Extract action value from Meta actions array ────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function findActionValue(actions: any[], actionType: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const action = actions.find((a: any) => a.action_type === actionType);
  return action ? parseFloat(action.value || "0") : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function findActionCost(costPerAction: any[], actionType: string): number {
  if (!costPerAction || !Array.isArray(costPerAction)) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const item = costPerAction.find((a: any) => a.action_type === actionType);
  return item ? parseFloat(item.value || "0") : 0;
}

// ── ROAS ────────────────────────────────────────────────────────────────────
/** Calculate ROAS from purchase_roas array or action_values/spend */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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

// ── Objective → Result Action Type mapping ──────────────────────────────────
/** Maps Meta campaign objectives to their expected primary result action type(s).
 *  Order within each array matters: first match wins.
 *  This is the single source of truth that keeps calcCPA, findResultsValue,
 *  and getResultsLabel in sync with the campaign's actual configuration. */
const OBJECTIVE_RESULT_MAP: Record<string, { type: string; resultLabel: string; cpaLabel: string }[]> = {
  // Leads — look for form leads first, then Messenger leads
  OUTCOME_LEADS:         [{ type: "leadgen_grouped", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "leadgen", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.lead_grouped", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.flow_complete", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "offsite_conversion.fb_pixel_lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "omni_lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.messaging_conversation_started_7d", resultLabel: "Leads (Messenger)", cpaLabel: "CPL" }, { type: "messaging_conversation_started_7d", resultLabel: "Leads (Messenger)", cpaLabel: "CPL" }, { type: "onsite_conversion.messaging_first_reply", resultLabel: "Leads (Messenger)", cpaLabel: "CPL" }],
  LEAD_GENERATION:       [{ type: "leadgen_grouped", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "leadgen", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.lead_grouped", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.flow_complete", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "offsite_conversion.fb_pixel_lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "omni_lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.messaging_conversation_started_7d", resultLabel: "Leads (Messenger)", cpaLabel: "CPL" }, { type: "messaging_conversation_started_7d", resultLabel: "Leads (Messenger)", cpaLabel: "CPL" }, { type: "onsite_conversion.messaging_first_reply", resultLabel: "Leads (Messenger)", cpaLabel: "CPL" }],
  // Sales / Conversions
  OUTCOME_SALES:         [{ type: "offsite_conversion.fb_pixel_purchase", resultLabel: "Compras", cpaLabel: "CPA" }, { type: "omni_purchase", resultLabel: "Compras", cpaLabel: "CPA" }, { type: "purchase", resultLabel: "Compras", cpaLabel: "CPA" }, { type: "omni_complete_registration", resultLabel: "Registros", cpaLabel: "CPR" }, { type: "offsite_conversion.fb_pixel_complete_registration", resultLabel: "Registros", cpaLabel: "CPR" }, { type: "complete_registration", resultLabel: "Registros", cpaLabel: "CPR" }, { type: "add_to_cart", resultLabel: "Carritos", cpaLabel: "CPATC" }],
  CONVERSIONS:           [{ type: "offsite_conversion.fb_pixel_purchase", resultLabel: "Compras", cpaLabel: "CPA" }, { type: "omni_purchase", resultLabel: "Compras", cpaLabel: "CPA" }, { type: "purchase", resultLabel: "Compras", cpaLabel: "CPA" }, { type: "omni_complete_registration", resultLabel: "Registros", cpaLabel: "CPR" }, { type: "offsite_conversion.fb_pixel_complete_registration", resultLabel: "Registros", cpaLabel: "CPR" }, { type: "complete_registration", resultLabel: "Registros", cpaLabel: "CPR" }, { type: "leadgen_grouped", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "leadgen", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.lead_grouped", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "onsite_conversion.flow_complete", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "offsite_conversion.fb_pixel_lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "omni_lead", resultLabel: "Leads", cpaLabel: "CPL" }, { type: "lead", resultLabel: "Leads", cpaLabel: "CPL" }],
  // Messages
  MESSAGES:              [{ type: "onsite_conversion.messaging_conversation_started_7d", resultLabel: "Conversaciones", cpaLabel: "CPConv" }, { type: "messaging_conversation_started_7d", resultLabel: "Conversaciones", cpaLabel: "CPConv" }, { type: "onsite_conversion.messaging_first_reply", resultLabel: "Conversaciones", cpaLabel: "CPConv" }],
  // Traffic
  OUTCOME_TRAFFIC:       [{ type: "link_click", resultLabel: "Clics al enlace", cpaLabel: "CPC" }],
  LINK_CLICKS:           [{ type: "link_click", resultLabel: "Clics al enlace", cpaLabel: "CPC" }],
  // Video Views
  VIDEO_VIEWS:           [{ type: "video_view", resultLabel: "ThruPlays", cpaLabel: "CPV" }],
  // Engagement
  OUTCOME_ENGAGEMENT:    [{ type: "onsite_conversion.messaging_conversation_started_7d", resultLabel: "Conversaciones", cpaLabel: "CPConv" }, { type: "messaging_conversation_started_7d", resultLabel: "Conversaciones", cpaLabel: "CPConv" }, { type: "onsite_conversion.messaging_first_reply", resultLabel: "Conversaciones", cpaLabel: "CPConv" }, { type: "video_view", resultLabel: "ThruPlays", cpaLabel: "CPV" }, { type: "post_engagement", resultLabel: "Interacciones", cpaLabel: "CPE" }],
  POST_ENGAGEMENT:       [{ type: "post_engagement", resultLabel: "Interacciones", cpaLabel: "CPE" }],
  // Awareness / Reach — no action-based result, but we still check ThruPlays for video awareness
  OUTCOME_AWARENESS:     [{ type: "video_view", resultLabel: "ThruPlays", cpaLabel: "CPV" }],
  BRAND_AWARENESS:       [{ type: "video_view", resultLabel: "ThruPlays", cpaLabel: "CPV" }],
  REACH:                 [{ type: "video_view", resultLabel: "ThruPlays", cpaLabel: "CPV" }],
  // App Promotion
  OUTCOME_APP_PROMOTION: [{ type: "omni_app_install", resultLabel: "Instalaciones", cpaLabel: "CPI" }, { type: "app_install", resultLabel: "Instalaciones", cpaLabel: "CPI" }],
};

// ── CPA / CPL (dynamic by objective) ────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcCPA(ins: any, objective?: string): { value: number; label: string } {
  const spend = ins.spend || 0;
  if (spend === 0) return { value: 0, label: "CPA" };

  // 1. Objective-aware: use the campaign's objective to pick the right action type
  if (objective && OBJECTIVE_RESULT_MAP[objective]) {
    for (const at of OBJECTIVE_RESULT_MAP[objective]) {
      const count = findActionValue(ins.actions, at.type);
      if (count > 0) return { value: spend / count, label: at.cpaLabel };
    }
  }

  // 2. Generic fallback: try common action types in priority order
  const actionTypes = [
    { type: "leadgen_grouped", label: "CPL" },
    { type: "leadgen", label: "CPL" },
    { type: "onsite_conversion.lead_grouped", label: "CPL" },
    { type: "onsite_conversion.lead", label: "CPL" },
    { type: "onsite_conversion.flow_complete", label: "CPL" },
    { type: "offsite_conversion.fb_pixel_lead", label: "CPL" },
    { type: "omni_lead", label: "CPL" },
    { type: "lead", label: "CPL" },
    { type: "offsite_conversion.fb_pixel_purchase", label: "CPA" },
    { type: "omni_purchase", label: "CPA" },
    { type: "purchase", label: "CPA" },
    { type: "omni_complete_registration", label: "CPR" },
    { type: "offsite_conversion.fb_pixel_complete_registration", label: "CPR" },
    { type: "complete_registration", label: "CPR" },
    { type: "add_to_cart", label: "CPATC" },
    { type: "onsite_conversion.messaging_conversation_started_7d", label: "CPConv" },
    { type: "messaging_conversation_started_7d", label: "CPConv" },
    { type: "onsite_conversion.messaging_first_reply", label: "CPConv" },
    { type: "link_click", label: "CPC" },
    { type: "video_view", label: "CPV" },
  ];

  for (const at of actionTypes) {
    const count = findActionValue(ins.actions, at.type);
    if (count > 0) return { value: spend / count, label: at.label };
  }

  // 3. Filtered cost_per_action_type fallback — only for relevant action types,
  // not generic ones like page_engagement that would produce nonsensical CPA values.
  if (ins.cost_per_action_type && ins.cost_per_action_type.length > 0) {
    const relevantTypes = [
      "leadgen_grouped", "leadgen", "onsite_conversion.lead_grouped", "onsite_conversion.lead", "onsite_conversion.flow_complete", "offsite_conversion.fb_pixel_lead", "omni_lead", "lead",
      "offsite_conversion.fb_pixel_purchase", "omni_purchase", "purchase",
      "omni_complete_registration", "offsite_conversion.fb_pixel_complete_registration", "complete_registration",
      "add_to_cart", "onsite_conversion.messaging_conversation_started_7d", "messaging_conversation_started_7d", "onsite_conversion.messaging_first_reply",
      "link_click", "video_view",
    ];
    const match = ins.cost_per_action_type.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      (c: any) => relevantTypes.includes(c.action_type)
    );
    if (match) {
      return { value: parseFloat(match.value || "0"), label: "CPA" };
    }
  }

  return { value: 0, label: "CPA" };
}

// ── Results value & label (objective-aware) ─────────────────────────────────
/** Generic fallback priority list — used when objective is unknown or doesn't
 *  match any action in the data. */
const RESULTS_PRIORITY: { type: string; label: string }[] = [
  { type: "onsite_conversion.messaging_conversation_started_7d", label: "Conversaciones" },
  { type: "messaging_conversation_started_7d", label: "Conversaciones" },
  { type: "onsite_conversion.messaging_first_reply", label: "Conversaciones" },
  { type: "leadgen_grouped", label: "Leads" },
  { type: "leadgen", label: "Leads" },
  { type: "onsite_conversion.lead_grouped", label: "Leads" },
  { type: "onsite_conversion.lead", label: "Leads" },
  { type: "onsite_conversion.flow_complete", label: "Leads" },
  { type: "offsite_conversion.fb_pixel_lead", label: "Leads" },
  { type: "omni_lead", label: "Leads" },
  { type: "lead", label: "Leads" },
  { type: "offsite_conversion.fb_pixel_purchase", label: "Compras" },
  { type: "omni_purchase", label: "Compras" },
  { type: "purchase", label: "Compras" },
  { type: "omni_complete_registration", label: "Registros" },
  { type: "offsite_conversion.fb_pixel_complete_registration", label: "Registros" },
  { type: "complete_registration", label: "Registros" },
  { type: "add_to_cart", label: "Carritos" },
  { type: "link_click", label: "Clics al enlace" },
  { type: "video_view", label: "ThruPlays" },
];

/** Find the primary result count from Meta's actions array.
 *  When `objective` is provided, the campaign's objective drives which action
 *  type is considered the "result" — e.g. a LEADS campaign prioritises `lead`
 *  over `messaging_conversation_started_7d`, even if both exist in the data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function findResultsValue(actions: any[], objective?: string): number {
  if (!actions || !Array.isArray(actions)) return 0;

  // 1. Objective-specific lookup
  if (objective && OBJECTIVE_RESULT_MAP[objective]) {
    for (const { type } of OBJECTIVE_RESULT_MAP[objective]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const a = actions.find((x: any) => x.action_type === type);
      if (a) return parseInt(a.value || "0", 10);
    }
  }

  // 2. Generic fallback
  for (const { type } of RESULTS_PRIORITY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const a = actions.find((x: any) => x.action_type === type);
    if (a) return parseInt(a.value || "0", 10);
  }
  return 0;
}

/** Human-readable label for the primary result type.
 *  Respects the campaign objective — a LEADS campaign using Messenger will
 *  show "Leads (Messenger)" instead of "Conversaciones". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function getResultsLabel(actions: any[], objective?: string): string {
  if (!actions || !Array.isArray(actions)) return "";

  // 1. Objective-specific lookup
  if (objective && OBJECTIVE_RESULT_MAP[objective]) {
    for (const { type, resultLabel } of OBJECTIVE_RESULT_MAP[objective]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      if (actions.find((x: any) => x.action_type === type)) return resultLabel;
    }
  }

  // 2. Generic fallback
  for (const { type, label } of RESULTS_PRIORITY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    if (actions.find((x: any) => x.action_type === type)) return label;
  }
  return "";
}

// ── Hook Rate (video campaigns) ─────────────────────────────────────────────
/** Hook Rate = 3-second video views / impressions × 100 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcHookRate(ins: any): number {
  const impressions = ins.impressions || 0;
  if (impressions === 0) return 0;
  // Real 3-second views; fall back to p25 only if the field is absent.
  const video3s = findActionValue(ins.video_3_sec_watched_actions, "video_view")
    || findActionValue(ins.video_p25_watched_actions, "video_view");
  if (video3s > 0) return (video3s / impressions) * 100;
  return 0;
}

// ── Landing Page Views ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
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
/** Detect Advantage+ campaigns via smart_promotion_type (fetched from the API)
 *  with a conservative name fallback for accounts that label them manually. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function isAdvantagePlus(row: any): boolean {
  // Authoritative signal: Meta marks Advantage+ campaigns with smart_promotion_type
  if (row.smart_promotion_type === "SMART_APP_PROMOTION" ||
      row.smart_promotion_type === "SMART_SHOPPING" ||
      row.smart_promotion_type === "AUTOMATED_SHOPPING_ADS") return true;
  // Name fallback: explicit labels only ("asc" must be a standalone word, not
  // a substring — "cascada"/"mascotas" are not Advantage+ campaigns).
  const name = (row.name || "").toLowerCase();
  return name.includes("advantage+") || name.includes("advantage plus") ||
         /(^|[^a-z])asc([^a-z]|$)/.test(name);
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

// ── Video Retention ─────────────────────────────────────────────────────────
/** Get video retention at 25/50/75/100% as percentages of impressions */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcVideoRetention(ins: any): { p25: number; p50: number; p75: number; p100: number } {
  const impressions = parseFloat(ins.impressions || "0");
  if (impressions === 0) return { p25: 0, p50: 0, p75: 0, p100: 0 };
  const p25 = findActionValue(ins.video_p25_watched_actions, "video_view");
  const p50 = findActionValue(ins.video_p50_watched_actions, "video_view");
  const p75 = findActionValue(ins.video_p75_watched_actions, "video_view");
  const p100 = findActionValue(ins.video_p100_watched_actions, "video_view");
  return {
    p25: (p25 / impressions) * 100,
    p50: (p50 / impressions) * 100,
    p75: (p75 / impressions) * 100,
    p100: (p100 / impressions) * 100,
  };
}

// ── ThruPlay Rate ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcThruPlayRate(ins: any): number {
  const impressions = parseFloat(ins.impressions || "0");
  if (impressions === 0) return 0;
  const thruplays = findActionValue(ins.video_thruplay_watched_actions, "video_view");
  return (thruplays / impressions) * 100;
}

// ── Outbound CTR ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcOutboundCTR(ins: any): number {
  const impressions = parseFloat(ins.impressions || "0");
  if (impressions === 0) return 0;
  if (ins.outbound_clicks_ctr && Array.isArray(ins.outbound_clicks_ctr)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const entry = ins.outbound_clicks_ctr.find((e: any) => e.action_type === "outbound_click");
    if (entry) return parseFloat(entry.value || "0");
  }
  if (ins.outbound_clicks && Array.isArray(ins.outbound_clicks)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const entry = ins.outbound_clicks.find((e: any) => e.action_type === "outbound_click");
    if (entry) return (parseFloat(entry.value || "0") / impressions) * 100;
  }
  return 0;
}

// ── Outbound Clicks ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcOutboundClicks(ins: any): number {
  if (ins.outbound_clicks && Array.isArray(ins.outbound_clicks)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const entry = ins.outbound_clicks.find((e: any) => e.action_type === "outbound_click");
    if (entry) return parseFloat(entry.value || "0");
  }
  return 0;
}

// ── Unique CTR ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcUniqueCTR(ins: any): number {
  if (ins.unique_ctr) return parseFloat(ins.unique_ctr);
  const uniqueClicks = parseFloat(ins.unique_clicks || "0");
  const reach = parseFloat(ins.reach || "0");
  if (reach === 0) return 0;
  return (uniqueClicks / reach) * 100;
}

// ── E-commerce Actions ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcAddToCart(ins: any): number {
  return findActionValue(ins.actions, "add_to_cart") || findActionValue(ins.actions, "omni_add_to_cart");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcInitiateCheckout(ins: any): number {
  return findActionValue(ins.actions, "initiate_checkout") || findActionValue(ins.actions, "omni_initiate_checkout");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcCostPerATC(ins: any): number {
  const atc = calcAddToCart(ins);
  const spend = parseFloat(ins.spend || "0");
  if (atc === 0 || spend === 0) return 0;
  return spend / atc;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcCostPerIC(ins: any): number {
  const ic = calcInitiateCheckout(ins);
  const spend = parseFloat(ins.spend || "0");
  if (ic === 0 || spend === 0) return 0;
  return spend / ic;
}

// ── Lead Form Metrics ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcLeadFormOpens(ins: any): number {
  return findActionValue(ins.actions, "leadgen_grouped") || findActionValue(ins.actions, "lead");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcLeadFormSubmits(ins: any): number {
  return findActionValue(ins.actions, "lead");
}

// ── ThruPlay Count ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcThruPlays(ins: any): number {
  return findActionValue(ins.video_thruplay_watched_actions, "video_view");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
export function calcCostPerThruPlay(ins: any): number {
  if (ins.cost_per_thruplay && Array.isArray(ins.cost_per_thruplay)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const entry = ins.cost_per_thruplay.find((e: any) => e.action_type === "video_view");
    if (entry) return parseFloat(entry.value || "0");
  }
  const thruplays = calcThruPlays(ins);
  const spend = parseFloat(ins.spend || "0");
  if (thruplays === 0 || spend === 0) return 0;
  return spend / thruplays;
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
