/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { StatusToggle } from "./StatusToggle";
import { InlineEditor } from "./InlineEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExternalLink, Plus, Pencil, ArrowUp, ArrowDown, ChevronsUpDown, Zap, AlertTriangle, TrendingUp, Radar } from "lucide-react";
import {
  OBJECTIVE_MAP, LEARNING_PHASE_MAP, SW_STATUS,
  calcROAS, calcCPA, calcHookRate, calcLandingPageViews,
  frequencyAlertLevel, isAdvantagePlus, findActionValue,
  findResultsValue, getResultsLabel,
  fmtROAS,
} from "@/lib/ads-metrics";

interface AdsManagerTableProps {
  level: "campaigns" | "adsets" | "ads";
    data: any[];
  selectedIds: string[];
  visibleColumns: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdateStatus: (id: string, status: "ACTIVE" | "PAUSED") => Promise<boolean>;
  onUpdateName: (id: string, name: string) => Promise<boolean>;
  onUpdateBudget?: (id: string, budget: number, type: "daily" | "lifetime") => Promise<boolean>;
  onUpdateBidAmount?: (id: string, bid: number) => Promise<boolean>;
    onEdit?: (item: any) => void;
    onRowClick?: (item: any) => void;
    breakdownData?: Record<string, any[]>;
  selectedBreakdown?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

// ── Number helpers ──────────────────────────────────────────────────────────
const safeFloat = (v: any, fallback = 0) => { const n = parseFloat(v); return isFinite(n) ? n : fallback; };
const safeInt   = (v: any, fallback = 0) => { const n = parseInt(v, 10); return isFinite(n) ? n : fallback; };
const fmt$   = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;
const fmtDec = (n: number) => n.toFixed(2);

// Relative time formatting for last_edited
const fmtRelTime = (iso: string | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return "Hace unos minutos";
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `Hace ${diffD}d`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

// Bid strategy label map
const BID_LABELS: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP: "Costo más bajo",
  LOWEST_COST_WITH_BID_CAP: "Límite de puja",
  COST_CAP: "Límite de costo",
  LOWEST_COST_WITH_MIN_ROAS: "ROAS mínimo",
  BID_CAP: "Límite de puja",
};

// ── Sticky column layout ─────────────────────────────────────────────────────
const CHECKBOX_W = 44;
const STATUS_W   = 56;
const NAME_W_DEFAULT = 340;
const DELIVERY_W = 120;
const BUDGET_W   = 150;
const BID_W      = 120;

// Solid backgrounds
const BG_HEADER = "rgba(4,9,22,1)";
const BG_ROW    = "rgba(8,12,24,1)";
const BG_HOVER  = "rgba(14,20,40,1)";
const BG_SEL    = "rgba(4,20,50,1)";
const BG_FOOTER = "rgba(3,7,18,1)";
const BORDER    = "1px solid var(--border)";

// Accent lines for header and footer
const TH_BORDER_BOTTOM = "2px solid rgba(59,130,246,0.45)";
const TF_BORDER_TOP    = "2px solid rgba(59,130,246,0.55)";

// ── Action helpers ──────────────────────────────────────────────────────────
// findResultsValue and getResultsLabel are imported from @/lib/ads-metrics
// to keep a single source of truth and prevent CPA/Results desync.

function findConversationsValue(actions: any[]): number {
  return findActionValue(actions, "onsite_conversion.messaging_conversation_started_7d");
}

// ── Sorting types ───────────────────────────────────────────────────────────
type SortDir = "asc" | "desc" | null;

export function AdsManagerTable({
  level,
  data,
  selectedIds,
  visibleColumns,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateStatus,
  onUpdateName,
  onUpdateBudget,
  onUpdateBidAmount,
  onEdit,
  onRowClick,
  breakdownData,
  selectedBreakdown,
  emptyTitle,
  emptyDescription,
}: AdsManagerTableProps) {
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;

  // ── Sorting state ─────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const handleSort = useCallback((col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc");
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }, [sortCol, sortDir]);

  // ── Sort data ─────────────────────────────────────────────────────────────
  const sortedData = useMemo(() => {
    if (!sortCol || !sortDir) return data;
    const sorted = [...data].sort((a, b) => {
      const insA = a.insights || {};
      const insB = b.insights || {};
            let valA: any, valB: any;

      switch (sortCol) {
        case "name":       valA = a.name?.toLowerCase() || ""; valB = b.name?.toLowerCase() || ""; break;
        case "status":     valA = a.status || ""; valB = b.status || ""; break;
        case "objective":  valA = a.objective || ""; valB = b.objective || ""; break;
        case "reach":      valA = safeInt(insA.reach); valB = safeInt(insB.reach); break;
        case "impressions":valA = safeInt(insA.impressions); valB = safeInt(insB.impressions); break;
        case "cpm":        valA = safeFloat(insA.cpm); valB = safeFloat(insB.cpm); break;
        case "frequency":  valA = safeFloat(insA.frequency) || (safeInt(insA.reach) > 0 ? safeInt(insA.impressions) / safeInt(insA.reach) : 0); valB = safeFloat(insB.frequency) || (safeInt(insB.reach) > 0 ? safeInt(insB.impressions) / safeInt(insB.reach) : 0); break;
        case "clicks":     valA = safeInt(insA.clicks); valB = safeInt(insB.clicks); break;
        case "ctr":        valA = safeFloat(insA.ctr); valB = safeFloat(insB.ctr); break;
        case "cpc":        valA = safeFloat(insA.cpc); valB = safeFloat(insB.cpc); break;
        case "results":    valA = findResultsValue(insA.actions, a.objective); valB = findResultsValue(insB.actions, b.objective); break;
        case "conversations": valA = findConversationsValue(insA.actions); valB = findConversationsValue(insB.actions); break;
        case "cost_per_message":
        case "cost_per_conversation": {
          const cA = findConversationsValue(insA.actions);
          const cB = findConversationsValue(insB.actions);
          valA = cA > 0 ? safeFloat(insA.spend) / cA : 0;
          valB = cB > 0 ? safeFloat(insB.spend) / cB : 0;
          break;
        }
        case "cpa":        valA = calcCPA(insA, a.objective).value; valB = calcCPA(insB, b.objective).value; break;
        case "spend":      valA = safeFloat(insA.spend); valB = safeFloat(insB.spend); break;
        case "roas":       valA = calcROAS(insA); valB = calcROAS(insB); break;
        case "landing_page_views": valA = calcLandingPageViews(insA); valB = calcLandingPageViews(insB); break;
        case "hook_rate":  valA = calcHookRate(insA); valB = calcHookRate(insB); break;
        case "purchases":  valA = findActionValue(insA.actions, "omni_purchase") || findActionValue(insA.actions, "purchase"); valB = findActionValue(insB.actions, "omni_purchase") || findActionValue(insB.actions, "purchase"); break;
        case "cost_per_purchase": { const pA = findActionValue(insA.actions, "omni_purchase") || findActionValue(insA.actions, "purchase"); const pB = findActionValue(insB.actions, "omni_purchase") || findActionValue(insB.actions, "purchase"); valA = pA > 0 ? safeFloat(insA.spend) / pA : 0; valB = pB > 0 ? safeFloat(insB.spend) / pB : 0; break; }
        case "leads":      valA = findActionValue(insA.actions, "lead"); valB = findActionValue(insB.actions, "lead"); break;
        case "cost_per_lead": { const lA = findActionValue(insA.actions, "lead"); const lB = findActionValue(insB.actions, "lead"); valA = lA > 0 ? safeFloat(insA.spend) / lA : 0; valB = lB > 0 ? safeFloat(insB.spend) / lB : 0; break; }
        case "outbound_clicks": valA = safeInt(insA.outbound_clicks?.[0]?.value); valB = safeInt(insB.outbound_clicks?.[0]?.value); break;
        case "outbound_ctr": { const ocA = safeInt(insA.outbound_clicks?.[0]?.value); const ocB = safeInt(insB.outbound_clicks?.[0]?.value); valA = safeInt(insA.impressions) > 0 ? (ocA / safeInt(insA.impressions)) * 100 : 0; valB = safeInt(insB.impressions) > 0 ? (ocB / safeInt(insB.impressions)) * 100 : 0; break; }
        case "unique_ctr": valA = safeFloat(insA.unique_ctr); valB = safeFloat(insB.unique_ctr); break;
        case "thruplay":   valA = findActionValue(insA.video_thruplay_watched_actions, "video_view"); valB = findActionValue(insB.video_thruplay_watched_actions, "video_view"); break;
        case "thruplay_rate": { const tpA = findActionValue(insA.video_thruplay_watched_actions, "video_view"); const tpB = findActionValue(insB.video_thruplay_watched_actions, "video_view"); valA = safeInt(insA.impressions) > 0 ? (tpA / safeInt(insA.impressions)) * 100 : 0; valB = safeInt(insB.impressions) > 0 ? (tpB / safeInt(insB.impressions)) * 100 : 0; break; }
        case "cost_per_thruplay": { const tpA2 = findActionValue(insA.video_thruplay_watched_actions, "video_view"); const tpB2 = findActionValue(insB.video_thruplay_watched_actions, "video_view"); valA = tpA2 > 0 ? safeFloat(insA.spend) / tpA2 : 0; valB = tpB2 > 0 ? safeFloat(insB.spend) / tpB2 : 0; break; }
        case "video_p25":  valA = findActionValue(insA.video_p25_watched_actions, "video_view"); valB = findActionValue(insB.video_p25_watched_actions, "video_view"); break;
        case "video_p50":  valA = findActionValue(insA.video_p50_watched_actions, "video_view"); valB = findActionValue(insB.video_p50_watched_actions, "video_view"); break;
        case "video_p75":  valA = findActionValue(insA.video_p75_watched_actions, "video_view"); valB = findActionValue(insB.video_p75_watched_actions, "video_view"); break;
        case "video_p100": valA = findActionValue(insA.video_p100_watched_actions, "video_view"); valB = findActionValue(insB.video_p100_watched_actions, "video_view"); break;
        case "add_to_cart": valA = findActionValue(insA.actions, "add_to_cart"); valB = findActionValue(insB.actions, "add_to_cart"); break;
        case "cost_per_atc": { const atcA = findActionValue(insA.actions, "add_to_cart"); const atcB = findActionValue(insB.actions, "add_to_cart"); valA = atcA > 0 ? safeFloat(insA.spend) / atcA : 0; valB = atcB > 0 ? safeFloat(insB.spend) / atcB : 0; break; }
        case "initiate_checkout": valA = findActionValue(insA.actions, "initiate_checkout"); valB = findActionValue(insB.actions, "initiate_checkout"); break;
        case "cost_per_ic": { const icA = findActionValue(insA.actions, "initiate_checkout"); const icB = findActionValue(insB.actions, "initiate_checkout"); valA = icA > 0 ? safeFloat(insA.spend) / icA : 0; valB = icB > 0 ? safeFloat(insB.spend) / icB : 0; break; }
        case "bid_strategy": valA = a.bid_strategy || ""; valB = b.bid_strategy || ""; break;
        case "optimization_goal": valA = a.optimization_goal || ""; valB = b.optimization_goal || ""; break;
        case "last_edited": valA = a.updated_time || ""; valB = b.updated_time || ""; break;
        case "engagement_ranking": valA = insA.engagement_rate_ranking || ""; valB = insB.engagement_rate_ranking || ""; break;
        case "conversion_ranking": valA = insA.conversion_rate_ranking || ""; valB = insB.conversion_rate_ranking || ""; break;
        case "budget": {
          const bA = a.daily_budget ? safeFloat(a.daily_budget) / 100 : a.lifetime_budget ? safeFloat(a.lifetime_budget) / 100 : 0;
          const bB = b.daily_budget ? safeFloat(b.daily_budget) / 100 : b.lifetime_budget ? safeFloat(b.lifetime_budget) / 100 : 0;
          valA = bA; valB = bB; break;
        }
        default: valA = 0; valB = 0;
      }

      if (typeof valA === "string") {
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return sorted;
  }, [data, sortCol, sortDir]);

  // ── Column resizing (metrics only) ─────────────────────────────────────────
  const defaultWidths: Record<string, number> = useMemo(() => ({
    name: NAME_W_DEFAULT,
    reach: 110, impressions: 120, cpm: 110, frequency: 110,
    clicks: 100, ctr: 90, cpc: 90, results: 110,
    conversations: 140, cost_per_message: 150, cost_per_conversation: 170,
    cpa: 150, spend: 140, quality_ranking: 130,
    roas: 110, objective: 140, landing_page_views: 130, hook_rate: 120,
    learning_phase: 160, advantage_plus: 110,
    // Ghost columns — now fully rendered
    purchases: 110, cost_per_purchase: 140, leads: 100, cost_per_lead: 130,
    outbound_clicks: 130, outbound_ctr: 110, unique_ctr: 110,
    thruplay: 120, thruplay_rate: 120, cost_per_thruplay: 150,
    video_p25: 110, video_p50: 110, video_p75: 110, video_p100: 110,
    video_plays: 130, video_plays_100: 140,
    add_to_cart: 120, cost_per_atc: 140, initiate_checkout: 140, cost_per_ic: 140,
    bid_strategy: 150, optimization_goal: 160, last_edited: 130,
    engagement_ranking: 140, conversion_ranking: 140,
  }), []);
  const [colWidths, setColWidths] = useState<Record<string, number>>(defaultWidths);
  const dragRef = useRef<{ col: string; startX: number; startW: number } | null>(null);

  const startResize = useCallback((col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { col, startX: e.clientX, startW: colWidths[col] ?? 120 };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const newW = Math.max(60, dragRef.current.startW + delta);
      setColWidths(prev => ({ ...prev, [dragRef.current!.col]: newW }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths]);

  // ── Compute frozen column left offsets ────────────────────────────────────
  const nameW     = colWidths["name"] ?? NAME_W_DEFAULT;
  const showName  = visibleColumns.includes("name");
  const showDel   = visibleColumns.includes("delivery");
  const showBudg  = visibleColumns.includes("budget") && level !== "ads";
  const showBid   = visibleColumns.includes("bid") && level === "adsets";

  let left = 0;
  const L_CHECK = left;  left += CHECKBOX_W;
  const L_STATUS = left; left += STATUS_W;
  const L_NAME   = left; if (showName) left += nameW;
  const L_DEL    = left; if (showDel) left += DELIVERY_W;
  const L_BUDG   = left; if (showBudg) left += BUDGET_W;
  const L_BID    = left; if (showBid) left += BID_W;
    const FROZEN_TOTAL = left;

  const frozenShadow = "4px 0 12px -2px rgba(0,0,0,0.7)";

  const isLastFrozen = (col: "name" | "delivery" | "budget" | "bid") => {
    if (col === "bid")     return showBid;
    if (col === "budget")  return showBudg && !showBid;
    if (col === "delivery")return showDel && !showBudg && !showBid;
    if (col === "name")    return showName && !showDel && !showBudg && !showBid;
    return false;
  };
  const statusIsLast = !showName && !showDel && !showBudg && !showBid;

  // ── Build ordered column definitions for <colgroup> ───────────────────────
  const SPACER_W = 44;
  const columnDefs = useMemo(() => {
    const cols: { key: string; width: number }[] = [
      { key: "_check", width: CHECKBOX_W },
      { key: "_status", width: STATUS_W },
    ];
    if (showName) cols.push({ key: "name", width: nameW });
    if (showDel)  cols.push({ key: "delivery", width: DELIVERY_W });
    if (showBudg) cols.push({ key: "budget", width: BUDGET_W });
    if (showBid)  cols.push({ key: "bid", width: BID_W });

    // Scrollable metric columns — must match render order exactly
    const metricOrder: { key: string; condition: boolean }[] = [
      { key: "objective",            condition: visibleColumns.includes("objective") && level === "campaigns" },
      { key: "roas",                 condition: visibleColumns.includes("roas") },
      { key: "learning_phase",       condition: visibleColumns.includes("learning_phase") && level === "adsets" },
      { key: "advantage_plus",       condition: visibleColumns.includes("advantage_plus") && level === "campaigns" },
      { key: "reach",                condition: visibleColumns.includes("reach") },
      { key: "impressions",          condition: visibleColumns.includes("impressions") },
      { key: "cpm",                  condition: visibleColumns.includes("cpm") },
      { key: "frequency",            condition: visibleColumns.includes("frequency") },
      { key: "clicks",               condition: visibleColumns.includes("clicks") },
      { key: "ctr",                  condition: visibleColumns.includes("ctr") },
      { key: "cpc",                  condition: visibleColumns.includes("cpc") },
      { key: "results",              condition: visibleColumns.includes("results") },
      { key: "conversations",        condition: visibleColumns.includes("conversations") },
      { key: "cost_per_message",     condition: visibleColumns.includes("cost_per_message") },
      { key: "cost_per_conversation",condition: visibleColumns.includes("cost_per_conversation") },
      { key: "cpa",                  condition: visibleColumns.includes("cpa") },
      { key: "landing_page_views",   condition: visibleColumns.includes("landing_page_views") },
      { key: "hook_rate",            condition: visibleColumns.includes("hook_rate") },
      { key: "spend",                condition: visibleColumns.includes("spend") },
      { key: "quality_ranking",      condition: visibleColumns.includes("quality_ranking") && level === "ads" },
      // ── Ghost columns (now rendered) ──
      { key: "purchases",            condition: visibleColumns.includes("purchases") },
      { key: "cost_per_purchase",    condition: visibleColumns.includes("cost_per_purchase") },
      { key: "leads",                condition: visibleColumns.includes("leads") },
      { key: "cost_per_lead",        condition: visibleColumns.includes("cost_per_lead") },
      { key: "outbound_clicks",      condition: visibleColumns.includes("outbound_clicks") },
      { key: "outbound_ctr",         condition: visibleColumns.includes("outbound_ctr") },
      { key: "unique_ctr",           condition: visibleColumns.includes("unique_ctr") },
      { key: "thruplay",             condition: visibleColumns.includes("thruplay") },
      { key: "thruplay_rate",        condition: visibleColumns.includes("thruplay_rate") },
      { key: "cost_per_thruplay",    condition: visibleColumns.includes("cost_per_thruplay") },
      { key: "video_p25",            condition: visibleColumns.includes("video_p25") },
      { key: "video_p50",            condition: visibleColumns.includes("video_p50") },
      { key: "video_p75",            condition: visibleColumns.includes("video_p75") },
      { key: "video_p100",           condition: visibleColumns.includes("video_p100") },
      { key: "video_plays",          condition: visibleColumns.includes("video_plays") },
      { key: "video_plays_100",      condition: visibleColumns.includes("video_plays_100") },
      { key: "add_to_cart",          condition: visibleColumns.includes("add_to_cart") },
      { key: "cost_per_atc",         condition: visibleColumns.includes("cost_per_atc") },
      { key: "initiate_checkout",    condition: visibleColumns.includes("initiate_checkout") },
      { key: "cost_per_ic",          condition: visibleColumns.includes("cost_per_ic") },
      { key: "bid_strategy",         condition: visibleColumns.includes("bid_strategy") && level !== "ads" },
      { key: "optimization_goal",    condition: visibleColumns.includes("optimization_goal") && level === "adsets" },
      { key: "last_edited",          condition: visibleColumns.includes("last_edited") },
      { key: "engagement_ranking",   condition: visibleColumns.includes("engagement_ranking") && level === "ads" },
      { key: "conversion_ranking",   condition: visibleColumns.includes("conversion_ranking") && level === "ads" },
    ];
    for (const m of metricOrder) {
      if (m.condition) cols.push({ key: m.key, width: colWidths[m.key] ?? defaultWidths[m.key] ?? 120 });
    }
    cols.push({ key: "_spacer", width: SPACER_W });
    return cols;
    }, [visibleColumns, level, colWidths, defaultWidths]);

  const totalTableWidth = useMemo(() => columnDefs.reduce((sum, c) => sum + c.width, 0), [columnDefs]);

  // ── Style helpers ─────────────────────────────────────────────────────────
  const CELL_PY = "8px";
  const CELL_PX = "10px";
  const CELL_PAD = `${CELL_PY} ${CELL_PX}`;

  const thBase: React.CSSProperties = {
    position: "sticky", top: 0, zIndex: 10,
    background: BG_HEADER, padding: CELL_PAD,
    fontSize: "10.5px", fontWeight: 700,
    color: "rgba(180,215,255,0.88)",
    borderBottom: TH_BORDER_BOTTOM,
    whiteSpace: "nowrap", textAlign: "left",
    userSelect: "none", overflow: "hidden",
    letterSpacing: "0.07em",
    cursor: "pointer",
  };

  const thFrozen = (leftOff: number, width: number, isLast = false): React.CSSProperties => ({
    ...thBase, left: leftOff, zIndex: 20, width, minWidth: width, maxWidth: width,
    boxShadow: isLast ? frozenShadow : undefined,
  });

  const thMetric = (col: string): React.CSSProperties => {
    const w = colWidths[col] ?? 120;
    return {
      ...thBase,
      width: w, minWidth: w, maxWidth: w,
      position: "relative",
    };
  };

  const tdBase: React.CSSProperties = {
    padding: CELL_PAD, borderBottom: BORDER,
    fontSize: "11px", whiteSpace: "nowrap", background: "transparent",
    overflow: "hidden", textOverflow: "ellipsis",
  };

  const tdMetric = (col: string): React.CSSProperties => {
    const w = colWidths[col] ?? 120;
    return {
      ...tdBase,
      width: w, minWidth: w, maxWidth: w,
    };
  };

  const tdFrozen = (leftOff: number, width: number, bg: string, isLast = false): React.CSSProperties => ({
    padding: CELL_PAD, borderBottom: BORDER,
    fontSize: "11px", whiteSpace: "nowrap",
    position: "sticky", left: leftOff, zIndex: 5,
    width, minWidth: width, maxWidth: width, background: bg,
    overflow: "hidden", textOverflow: "ellipsis",
    boxShadow: isLast ? frozenShadow : undefined,
  });

  const tfBase: React.CSSProperties = {
    position: "sticky", bottom: 0,
    background: BG_FOOTER, padding: CELL_PAD,
    fontSize: "11px", fontWeight: 700,
    color: "rgba(180,215,255,0.85)",
    borderTop: TF_BORDER_TOP, whiteSpace: "nowrap",
    letterSpacing: "0.04em",
    zIndex: 10,
    overflow: "hidden", textOverflow: "ellipsis",
  };

  const tfMetric = (col: string): React.CSSProperties => {
    const w = colWidths[col] ?? 120;
    return {
      ...tfBase,
      width: w, minWidth: w, maxWidth: w,
    };
  };

  const tfFrozen = (leftOff: number, width: number, isLast = false): React.CSSProperties => ({
    ...tfBase, left: leftOff, zIndex: 30,
    width, minWidth: width, maxWidth: width,
    boxShadow: isLast ? frozenShadow : undefined,
  });

  // ── Sort indicator ────────────────────────────────────────────────────────
  const renderSortIcon = (col: string) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 inline-block ml-1" style={{ opacity: 0.3 }} />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 inline-block ml-1" style={{ color: "var(--cyan)" }} />;
    return <ArrowDown className="w-3 h-3 inline-block ml-1" style={{ color: "var(--cyan)" }} />;
  };

  // ── Resize handle ─────────────────────────────────────────────────────────
  const renderResizeHandle = (col: string) => (
    <div
      onMouseDown={e => startResize(col, e)}
      style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 5,
        cursor: "col-resize", background: "transparent", zIndex: 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.3)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    />
  );

  // ── Compute totals ────────────────────────────────────────────────────────
  let totalSpend = 0, totalImpressions = 0, totalClicks = 0;
  let totalResults = 0, totalConversations = 0, totalReach = 0;
  let totalLPV = 0;
  let totalPurchaseValue = 0;
  let totalVideo3s = 0;
  // Ghost column totals
  let totalPurchases = 0, totalLeads = 0;
  let totalOutboundClicks = 0;
  let totalThruplay = 0;
  let totalVP25 = 0, totalVP50 = 0, totalVP75 = 0, totalVP100 = 0;
  let totalATC = 0, totalIC = 0;

  sortedData.forEach(row => {
    const ins = row.insights || {};
    totalSpend         += safeFloat(ins.spend);
    totalImpressions   += safeInt(ins.impressions);
    totalClicks        += safeInt(ins.clicks);
    totalResults       += findResultsValue(ins.actions, row.objective);
    totalConversations += findConversationsValue(ins.actions);
    totalReach         += safeInt(ins.reach);
    totalLPV           += calcLandingPageViews(ins);

    // Sum purchase value for ROAS
    if (ins.purchase_roas && Array.isArray(ins.purchase_roas) && ins.purchase_roas.length > 0) {
      const roasVal = parseFloat(ins.purchase_roas[0]?.value || "0");
      totalPurchaseValue += safeFloat(ins.spend) * roasVal;
    } else if (ins.action_values) {
      const pv = findActionValue(ins.action_values, "omni_purchase") || findActionValue(ins.action_values, "purchase");
      totalPurchaseValue += pv;
    }

    // Sum video 3s views for hook rate
    const v3s = findActionValue(ins.video_p25_watched_actions || ins.actions, "video_view");
    totalVideo3s += v3s;

    // Ghost column accumulators
    totalPurchases += findActionValue(ins.actions, "omni_purchase") || findActionValue(ins.actions, "purchase");
    totalLeads += findActionValue(ins.actions, "lead");
    totalOutboundClicks += safeInt(ins.outbound_clicks?.[0]?.value);
    totalThruplay += findActionValue(ins.video_thruplay_watched_actions, "video_view");
    totalVP25 += findActionValue(ins.video_p25_watched_actions, "video_view");
    totalVP50 += findActionValue(ins.video_p50_watched_actions, "video_view");
    totalVP75 += findActionValue(ins.video_p75_watched_actions, "video_view");
    totalVP100 += findActionValue(ins.video_p100_watched_actions, "video_view");
    totalATC += findActionValue(ins.actions, "add_to_cart");
    totalIC += findActionValue(ins.actions, "initiate_checkout");
  });
  const avgCtr        = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc        = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm        = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCpa        = totalResults > 0 ? totalSpend / totalResults : 0;
  const avgCostPerMsg = totalConversations > 0 ? totalSpend / totalConversations : 0;
  const avgFreq       = totalReach > 0 ? totalImpressions / totalReach : 0;
  const avgRoas       = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;
  const avgHookRate   = totalImpressions > 0 ? (totalVideo3s / totalImpressions) * 100 : 0;
  // Ghost column averages
  const avgCPPurchase = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const avgCPLead     = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgOutboundCtr = totalImpressions > 0 ? (totalOutboundClicks / totalImpressions) * 100 : 0;
  const avgThruplayRate = totalImpressions > 0 ? (totalThruplay / totalImpressions) * 100 : 0;
  const avgCPThruplay = totalThruplay > 0 ? totalSpend / totalThruplay : 0;
  const avgCPAtc      = totalATC > 0 ? totalSpend / totalATC : 0;
  const avgCPIc       = totalIC > 0 ? totalSpend / totalIC : 0;

  // ── Helper: Sortable header cell for metrics ──────────────────────────────
  const renderMetricTh = (col: string, label: string) => (
    visibleColumns.includes(col) ? (
      <th
        style={{ ...thMetric(col), position: "sticky", top: 0 }}
        onClick={() => handleSort(col)}
      >
        {label} {renderSortIcon(col)} {renderResizeHandle(col)}
      </th>
    ) : null
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        position: "relative",
      }}
    >
      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0, minWidth: 0, WebkitOverflowScrolling: "touch" }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            tableLayout: "fixed",
            textAlign: "left",
            width: totalTableWidth,
          }}
        >
          {/* ════ COLGROUP — guarantees pixel-perfect column alignment ════ */}
          <colgroup>
            {columnDefs.map(c => (
              <col key={c.key} style={{ width: c.width, minWidth: c.width }} />
            ))}
          </colgroup>
          {/* ════ THEAD ════ */}
          <thead>
            <tr>
              {/* ── FROZEN: Checkbox ── */}
              <th style={{ ...thFrozen(L_CHECK, CHECKBOX_W, statusIsLast), zIndex: 20, cursor: "default" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  style={{ accentColor: "var(--cyan)", cursor: "pointer" }}
                />
              </th>

              {/* ── FROZEN: Status ── */}
              <th style={thFrozen(L_STATUS, STATUS_W, statusIsLast)} onClick={() => handleSort("status")}>
                {renderSortIcon("")}
              </th>

              {/* ── FROZEN: Name ── */}
              {showName && (
                <th
                  style={{ ...thFrozen(L_NAME, nameW, isLastFrozen("name")), position: "sticky" }}
                  onClick={() => handleSort("name")}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                    {level === "campaigns" ? "CAMPAÑA" : level === "adsets" ? "CONJUNTO" : "ANUNCIO"}
                    {renderSortIcon("")}
                  </span>
                  <div
                    onMouseDown={e => startResize("name", e)}
                    style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, cursor: "col-resize", background: "transparent", zIndex: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={e => e.stopPropagation()}
                  />
                </th>
              )}

              {/* ── FROZEN: Delivery ── */}
              {showDel && (
                <th style={thFrozen(L_DEL, DELIVERY_W, isLastFrozen("delivery"))}>
                  ENTREGA
                </th>
              )}

              {/* ── FROZEN: Budget ── */}
              {showBudg && (
                <th style={thFrozen(L_BUDG, BUDGET_W, isLastFrozen("budget"))} onClick={() => handleSort("budget")}>
                  PRESUPUESTO {renderSortIcon("")}
                </th>
              )}

              {/* ── FROZEN: Bid ── */}
              {showBid && (
                <th style={thFrozen(L_BID, BID_W, isLastFrozen("bid"))}>
                  PUJA
                </th>
              )}

              {/* ══════ SCROLLABLE METRIC HEADERS ══════ */}
              {/* Objective (campaigns only) */}
              {visibleColumns.includes("objective") && level === "campaigns" && (
                <th style={{ ...thMetric("objective"), position: "sticky", top: 0 }} onClick={() => handleSort("objective")}>
                  OBJETIVO {renderSortIcon("")} {renderResizeHandle("")}
                </th>
              )}

              {/* ROAS */}
              {renderMetricTh("", "")}

              {/* Learning Phase (adsets only) */}
              {visibleColumns.includes("learning_phase") && level === "adsets" && (
                <th style={{ ...thMetric("learning_phase"), position: "sticky", top: 0 }}>
                  FASE {renderResizeHandle("")}
                </th>
              )}

              {/* Advantage+ (campaigns only) */}
              {visibleColumns.includes("advantage_plus") && level === "campaigns" && (
                <th style={{ ...thMetric("advantage_plus"), position: "sticky", top: 0 }}>
                  ADV+ {renderResizeHandle("")}
                </th>
              )}

              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}

              {visibleColumns.includes("quality_ranking") && level === "ads" && (
                <th style={{ ...thMetric("quality_ranking"), position: "sticky", top: 0 }}>
                  CALIDAD {renderResizeHandle("")}
                </th>
              )}

              {/* ── Ghost columns headers ── */}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {renderMetricTh("", "")}
              {visibleColumns.includes("bid_strategy") && level !== "ads" && (
                <th style={{ ...thMetric("bid_strategy"), position: "sticky", top: 0 }}>
                  ESTRATEGIA PUJA {renderResizeHandle("")}
                </th>
              )}
              {visibleColumns.includes("optimization_goal") && level === "adsets" && (
                <th style={{ ...thMetric("optimization_goal"), position: "sticky", top: 0 }}>
                  OPTIMIZACIÓN {renderResizeHandle("")}
                </th>
              )}
              {renderMetricTh("", "")}
              {visibleColumns.includes("engagement_ranking") && level === "ads" && (
                <th style={{ ...thMetric("engagement_ranking"), position: "sticky", top: 0 }}>
                  INTERACCIÓN {renderResizeHandle("")}
                </th>
              )}
              {visibleColumns.includes("conversion_ranking") && level === "ads" && (
                <th style={{ ...thMetric("conversion_ranking"), position: "sticky", top: 0 }}>
                  CONVERSIÓN {renderResizeHandle("")}
                </th>
              )}

              {/* Expand filler */}
              <th style={{ ...thBase, width: SPACER_W, minWidth: SPACER_W, maxWidth: SPACER_W, cursor: "default" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Plus className="w-4 h-4" />
                </div>
              </th>
            </tr>
          </thead>

          {/* ════ TBODY ════ */}
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 6} style={{ padding: 0 }}>
                  <EmptyState
                    icon={<Radar className="w-12 h-12" />}
                    title={emptyTitle || "Señal Perdida"}
                    description={emptyDescription || "No se encontraron elementos. Selecciona una cuenta publicitaria y asegúrate de tener sincronizado el Holocrón."}
                  />
                </td>
              </tr>
            ) : (
              sortedData.map(row => {
                const isSelected   = selectedIds.includes(row.id);
                const ins          = row.insights || {};
                const resultsCount = findResultsValue(ins.actions, row.objective);
                const resultsLabel = getResultsLabel(ins.actions, row.objective);
                const convsCount   = findConversationsValue(ins.actions);
                const hasDaily     = row.daily_budget !== undefined;
                const hasLifetime  = row.lifetime_budget !== undefined;
                const rawBudget    = hasDaily
                  ? safeFloat(row.daily_budget) / 100
                  : hasLifetime
                  ? safeFloat(row.lifetime_budget) / 100
                  : 0;
                const reach        = safeInt(ins.reach);
                const impressions  = safeInt(ins.impressions);
                const freq         = reach > 0 ? impressions / reach : safeFloat(ins.frequency);
                const spend        = safeFloat(ins.spend);
                const costPerConv  = convsCount > 0 ? spend / convsCount : 0;
                const roas         = calcROAS(ins);
                const cpa          = calcCPA(ins, row.objective);
                const hookRate     = calcHookRate(ins);
                const lpv          = calcLandingPageViews(ins);
                const freqAlert    = frequencyAlertLevel(freq);
                const objInfo      = OBJECTIVE_MAP[row.objective] || null;
                const isAdvPlus    = isAdvantagePlus(row);
                const learningInfo = row.learning_phase_info;
                const learningStatus = learningInfo?.status || "";
                const learningMapped = LEARNING_PHASE_MAP[learningStatus] || null;

                const rowBg  = isSelected ? BG_SEL : BG_ROW;
                const rowHov = isSelected ? BG_SEL : BG_HOVER;

                return (
                  <React.Fragment key={row.id}>
                  <tr
                    style={{ background: rowBg, cursor: onRowClick ? "pointer" : undefined }}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = rowHov;
                      e.currentTarget.querySelectorAll<HTMLElement>("td[data-frozen]").forEach(el => {
                        el.style.background = rowHov;
                      });
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = rowBg;
                      e.currentTarget.querySelectorAll<HTMLElement>("td[data-frozen]").forEach(el => {
                        el.style.background = rowBg;
                      });
                    }}
                  >
                    {/* ── FROZEN: Checkbox ── */}
                    <td data-frozen style={tdFrozen(L_CHECK, CHECKBOX_W, rowBg, statusIsLast)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(row.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ accentColor: "var(--cyan)", cursor: "pointer" }}
                      />
                    </td>

                    {/* ── FROZEN: Status ── */}
                    <td data-frozen style={tdFrozen(L_STATUS, STATUS_W, rowBg, statusIsLast)} onClick={e => e.stopPropagation()}>
                      <StatusToggle
                        status={row.status}
                        onToggle={status => onUpdateStatus(row.id, status)}
                      />
                    </td>

                    {/* ── FROZEN: Name ── */}
                    {showName && (
                      <td data-frozen style={tdFrozen(L_NAME, nameW, rowBg, isLastFrozen("name"))} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* ── Ad Creative Preview (ads level only) ── */}
                          {level === "ads" && (() => {
                            const creative = row.creative || {};
                            const thumbUrl = creative.thumbnail_url || creative.image_url || null;
                            if (!thumbUrl) return (
                              <div style={{
                                width: 44, height: 44, minWidth: 44, borderRadius: 6,
                                background: "var(--surface)",
                                border: "1px solid rgba(100,120,150,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 8, color: "var(--text-muted)",
                                fontWeight: 600, letterSpacing: "0.05em",
                              }}>
                                AD
                              </div>
                            );
                            return (
                              <div style={{ position: "relative", flexShrink: 0 }} className="ad-thumb-wrap">
                                                                <img
                                  src={thumbUrl}
                                  alt={row.name || "Ad preview"}
                                  loading="lazy"
                                  style={{
                                    width: 44, height: 44, borderRadius: 6,
                                    objectFit: "cover",
                                    border: "1px solid rgba(100,120,150,0.2)",
                                    transition: "transform 0.2s, box-shadow 0.2s",
                                    cursor: "zoom-in",
                                  }}
                                  onError={e => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                  onMouseEnter={e => {
                                    const img = e.currentTarget;
                                    img.style.transform = "scale(3.5)";
                                    img.style.zIndex = "100";
                                    img.style.position = "relative";
                                    img.style.boxShadow = "0 8px 32px rgba(0,0,0,0.8)";
                                    img.style.borderRadius = "8px";
                                  }}
                                  onMouseLeave={e => {
                                    const img = e.currentTarget;
                                    img.style.transform = "scale(1)";
                                    img.style.zIndex = "auto";
                                    img.style.position = "static";
                                    img.style.boxShadow = "none";
                                    img.style.borderRadius = "6px";
                                  }}
                                />
                              </div>
                            );
                          })()}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <InlineEditor
                                value={row.name}
                                onSave={name => onUpdateName(row.id, name as string)}
                              />
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(row)}
                                  title="Editar en detalle"
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    width: 20, height: 20,
                                    background: "var(--surface)",
                                    border: "1px solid rgba(59,130,246,0.2)",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    color: "var(--cyan)",
                                    padding: 0,
                                    flexShrink: 0,
                                    transition: "all 0.15s",
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,129,251,0.25)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,129,251,0.12)"; }}
                                >
                                  <Pencil style={{ width: 10, height: 10 }} />
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                              {row._accountName && <span style={{ padding: "1px 4px", fontSize: 8, background: "var(--surface)", color: "rgba(59,130,246,0.7)", borderRadius: 2, fontWeight: 600 }}>{row._accountName}</span>}
                              ID: {row.id}{" "}
                              <a
                                href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${row.campaign_id || row.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", color: "var(--cyan)" }}
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* ── FROZEN: Delivery ── */}
                    {showDel && (
                      <td data-frozen style={tdFrozen(L_DEL, DELIVERY_W, rowBg, isLastFrozen("delivery"))}>
                        {(() => {
                          const effStatus = row.effective_status || row.status;
                          const sw = SW_STATUS[effStatus] || SW_STATUS[row.status] || { label: effStatus, color: "var(--text-muted)", glow: "rgba(107,114,128,0.3)" };
                          return (
                            <span style={{
                              fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                              background: `${sw.glow}`, color: sw.color,
                              border: `1px solid ${sw.color}33`,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                            }}>
                              {sw.label}
                            </span>
                          );
                        })()}
                      </td>
                    )}

                    {/* ── FROZEN: Budget ── */}
                    {showBudg && (
                      <td data-frozen style={tdFrozen(L_BUDG, BUDGET_W, rowBg, isLastFrozen("budget"))} onClick={e => e.stopPropagation()}>
                        {rawBudget > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {onUpdateBudget ? (
                              <InlineEditor
                                value={rawBudget}
                                type="number"
                                prefix="$"
                                onSave={val => onUpdateBudget(row.id, val as number, hasDaily ? "daily" : "lifetime")}
                              />
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 500 }}>{fmt$(rawBudget)}</span>
                            )}
                            <span style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>
                              {hasDaily ? "Diario" : "Total"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Usando CBO</span>
                        )}
                      </td>
                    )}

                    {/* ── FROZEN: Bid ── */}
                    {showBid && (
                      <td data-frozen style={tdFrozen(L_BID, BID_W, rowBg, isLastFrozen("bid"))} onClick={e => e.stopPropagation()}>
                        {row.bid_amount ? (
                          <InlineEditor
                            value={safeFloat(row.bid_amount) / 100}
                            type="number"
                            prefix="$"
                            onSave={val => onUpdateBidAmount ? onUpdateBidAmount(row.id, val as number) : Promise.resolve(false)}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Automático</span>
                        )}
                      </td>
                    )}

                    {/* ══════ SCROLLABLE METRICS ══════ */}

                    {/* Objective */}
                    {visibleColumns.includes("objective") && level === "campaigns" && (
                      <td style={tdMetric("objective")}>
                        {objInfo ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                            background: `${objInfo.color}15`, color: objInfo.color,
                            border: `1px solid ${objInfo.color}25`,
                          }}>
                            {objInfo.icon} {objInfo.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{row.objective || "—"}</span>
                        )}
                      </td>
                    )}

                    {/* ROAS */}
                    {visibleColumns.includes("roas") && (
                      <td style={tdMetric("roas")}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: roas === 0 ? "var(--text-muted)"
                            : roas >= 3 ? "var(--emerald)"
                            : roas >= 1.5 ? "var(--amber)"
                            : "var(--red)",
                        }}>
                          {roas === 0 ? "—" : fmtROAS(roas)}
                        </span>
                      </td>
                    )}

                    {/* Learning Phase (adsets) */}
                    {visibleColumns.includes("learning_phase") && level === "adsets" && (
                      <td style={tdMetric("learning_phase")}>
                        {learningMapped ? (
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                            background: `${learningMapped.color}15`, color: learningMapped.color,
                            border: `1px solid ${learningMapped.color}25`,
                            letterSpacing: "0.04em",
                          }}>
                            {learningMapped.swLabel}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    )}

                    {/* Advantage+ (campaigns) */}
                    {visibleColumns.includes("advantage_plus") && level === "campaigns" && (
                      <td style={tdMetric("advantage_plus")}>
                        {isAdvPlus ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                            background: "var(--surface)", color: "var(--purple)",
                            border: "1px solid rgba(155,123,232,0.25)",
                          }}>
                            <Zap className="w-3 h-3" /> ADV+
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes("reach") && (
                      <td style={{ ...tdMetric("reach"), color: "var(--foreground)" }}>{fmtNum(reach)}</td>
                    )}
                    {visibleColumns.includes("impressions") && (
                      <td style={{ ...tdMetric("impressions"), color: "var(--foreground)" }}>{fmtNum(impressions)}</td>
                    )}
                    {visibleColumns.includes("cpm") && (
                      <td style={{ ...tdMetric("cpm"), color: "var(--foreground)" }}>{fmt$(safeFloat(ins.cpm))}</td>
                    )}
                    {visibleColumns.includes("frequency") && (
                      <td style={{
                        ...tdMetric("frequency"),
                        color: freqAlert === "critical" ? "var(--red)"
                          : freqAlert === "warning" ? "var(--amber)"
                          : "var(--foreground)",
                        fontWeight: freqAlert !== "none" ? 700 : undefined,
                      }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {fmtDec(freq)}
                          {freqAlert === "critical" && <AlertTriangle className="w-3 h-3" style={{ color: "var(--red)", animation: "pulse 1.5s infinite" }} />}
                          {freqAlert === "warning" && <AlertTriangle className="w-3 h-3" style={{ color: "var(--amber)" }} />}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("clicks") && (
                      <td style={{ ...tdMetric("clicks"), color: "var(--foreground)" }}>{fmtNum(safeInt(ins.clicks))}</td>
                    )}
                    {visibleColumns.includes("ctr") && (
                      <td style={{ ...tdMetric("ctr"), color: "var(--foreground)" }}>{fmtPct(safeFloat(ins.ctr))}</td>
                    )}
                    {visibleColumns.includes("cpc") && (
                      <td style={{ ...tdMetric("cpc"), color: "var(--foreground)" }}>{fmt$(safeFloat(ins.cpc))}</td>
                    )}
                    {visibleColumns.includes("results") && (
                      <td style={tdMetric("results")}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>{fmtNum(resultsCount)}</span>
                          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{resultsLabel}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("conversations") && (
                      <td style={{ ...tdMetric("conversations"), color: "var(--foreground)", fontWeight: 600 }}>{fmtNum(convsCount)}</td>
                    )}
                    {visibleColumns.includes("cost_per_message") && (
                      <td style={{ ...tdMetric("cost_per_message"), color: "var(--cyan)" }}>
                        {convsCount > 0 ? fmt$(costPerConv) : "$0.00"}
                      </td>
                    )}
                    {visibleColumns.includes("cost_per_conversation") && (
                      <td style={{ ...tdMetric("cost_per_conversation"), color: "var(--cyan)" }}>
                        {convsCount > 0 ? fmt$(costPerConv) : "$0.00"}
                      </td>
                    )}
                    {visibleColumns.includes("cpa") && (
                      <td style={tdMetric("cpa")}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--cyan)" }}>
                            {cpa.value > 0 ? fmt$(cpa.value) : "—"}
                          </span>
                          <span style={{ fontSize: 8, color: "var(--text-muted)" }}>{cpa.label}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("landing_page_views") && (
                      <td style={{ ...tdMetric("landing_page_views"), color: "var(--foreground)" }}>{lpv > 0 ? fmtNum(lpv) : "—"}</td>
                    )}
                    {visibleColumns.includes("hook_rate") && (
                      <td style={tdMetric("hook_rate")}>
                        {hookRate > 0 ? (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: hookRate >= 35 ? "var(--emerald)" : hookRate >= 20 ? "var(--amber)" : "var(--red)",
                          }}>
                            {fmtPct(hookRate)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes("spend") && (
                      <td style={tdMetric("spend")}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>{fmt$(spend)}</span>
                      </td>
                    )}
                    {visibleColumns.includes("quality_ranking") && level === "ads" && (
                      <td style={tdMetric("quality_ranking")}>
                        <span
                          style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: ins.quality_ranking?.includes("ABOVE")
                              ? "rgba(52,183,124,0.15)"
                              : ins.quality_ranking?.includes("BELOW")
                              ? "rgba(229,72,77,0.15)"
                              : "rgba(224,168,60,0.15)",
                            color: ins.quality_ranking?.includes("ABOVE")
                              ? "var(--emerald)"
                              : ins.quality_ranking?.includes("BELOW")
                              ? "var(--red)"
                              : "var(--amber)",
                          }}
                        >
                          {ins.quality_ranking || "PROMEDIO"}
                        </span>
                      </td>
                    )}

                    {/* ── Ghost columns row cells ── */}
                    {visibleColumns.includes("purchases") && (() => {
                      const v = findActionValue(ins.actions, "omni_purchase") || findActionValue(ins.actions, "purchase");
                      return <td style={{ ...tdMetric("purchases"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("cost_per_purchase") && (() => {
                      const p = findActionValue(ins.actions, "omni_purchase") || findActionValue(ins.actions, "purchase");
                      const cpp = p > 0 ? spend / p : 0;
                      return <td style={{ ...tdMetric("cost_per_purchase"), color: "var(--cyan)" }}>{cpp > 0 ? fmt$(cpp) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("leads") && (() => {
                      const v = findActionValue(ins.actions, "lead");
                      return <td style={{ ...tdMetric("leads"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("cost_per_lead") && (() => {
                      const l = findActionValue(ins.actions, "lead");
                      const cpl = l > 0 ? spend / l : 0;
                      return <td style={{ ...tdMetric("cost_per_lead"), color: "var(--cyan)" }}>{cpl > 0 ? fmt$(cpl) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("outbound_clicks") && (
                      <td style={{ ...tdMetric("outbound_clicks"), color: "var(--foreground)" }}>
                        {safeInt(ins.outbound_clicks?.[0]?.value) > 0 ? fmtNum(safeInt(ins.outbound_clicks?.[0]?.value)) : "—"}
                      </td>
                    )}
                    {visibleColumns.includes("outbound_ctr") && (() => {
                      const oc = safeInt(ins.outbound_clicks?.[0]?.value);
                      const octr = impressions > 0 ? (oc / impressions) * 100 : 0;
                      return <td style={{ ...tdMetric("outbound_ctr"), color: "var(--foreground)" }}>{octr > 0 ? fmtPct(octr) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("unique_ctr") && (
                      <td style={{ ...tdMetric("unique_ctr"), color: "var(--foreground)" }}>
                        {safeFloat(ins.unique_ctr) > 0 ? fmtPct(safeFloat(ins.unique_ctr)) : "—"}
                      </td>
                    )}
                    {visibleColumns.includes("thruplay") && (() => {
                      const tp = findActionValue(ins.video_thruplay_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("thruplay"), color: "var(--foreground)" }}>{tp > 0 ? fmtNum(tp) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("thruplay_rate") && (() => {
                      const tp = findActionValue(ins.video_thruplay_watched_actions, "video_view");
                      const rate = impressions > 0 ? (tp / impressions) * 100 : 0;
                      return <td style={{ ...tdMetric("thruplay_rate"), color: "var(--foreground)" }}>{rate > 0 ? fmtPct(rate) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("cost_per_thruplay") && (() => {
                      const tp = findActionValue(ins.video_thruplay_watched_actions, "video_view");
                      const cpt = tp > 0 ? spend / tp : 0;
                      return <td style={{ ...tdMetric("cost_per_thruplay"), color: "var(--cyan)" }}>{cpt > 0 ? fmt$(cpt) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("video_p25") && (() => {
                      const v = findActionValue(ins.video_p25_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("video_p25"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("video_p50") && (() => {
                      const v = findActionValue(ins.video_p50_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("video_p50"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("video_p75") && (() => {
                      const v = findActionValue(ins.video_p75_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("video_p75"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("video_p100") && (() => {
                      const v = findActionValue(ins.video_p100_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("video_p100"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("video_plays") && (() => {
                      const v = findActionValue(ins.video_p25_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("video_plays"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("video_plays_100") && (() => {
                      const v = findActionValue(ins.video_p100_watched_actions, "video_view");
                      return <td style={{ ...tdMetric("video_plays_100"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("add_to_cart") && (() => {
                      const v = findActionValue(ins.actions, "add_to_cart");
                      return <td style={{ ...tdMetric("add_to_cart"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("cost_per_atc") && (() => {
                      const atc = findActionValue(ins.actions, "add_to_cart");
                      const cpa2 = atc > 0 ? spend / atc : 0;
                      return <td style={{ ...tdMetric("cost_per_atc"), color: "var(--cyan)" }}>{cpa2 > 0 ? fmt$(cpa2) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("initiate_checkout") && (() => {
                      const v = findActionValue(ins.actions, "initiate_checkout");
                      return <td style={{ ...tdMetric("initiate_checkout"), color: "var(--foreground)" }}>{v > 0 ? fmtNum(v) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("cost_per_ic") && (() => {
                      const ic = findActionValue(ins.actions, "initiate_checkout");
                      const cpic = ic > 0 ? spend / ic : 0;
                      return <td style={{ ...tdMetric("cost_per_ic"), color: "var(--cyan)" }}>{cpic > 0 ? fmt$(cpic) : "—"}</td>;
                    })()}
                    {visibleColumns.includes("bid_strategy") && level !== "ads" && (
                      <td style={{ ...tdMetric("bid_strategy"), fontSize: 9, color: "var(--text-secondary)" }}>
                        {BID_LABELS[row.bid_strategy] || row.bid_strategy || "—"}
                      </td>
                    )}
                    {visibleColumns.includes("optimization_goal") && level === "adsets" && (
                      <td style={{ ...tdMetric("optimization_goal"), fontSize: 9, color: "var(--text-secondary)" }}>
                        {row.optimization_goal?.replace(/_/g, " ") || "—"}
                      </td>
                    )}
                    {visibleColumns.includes("last_edited") && (
                      <td style={{ ...tdMetric("last_edited"), fontSize: 10, color: "var(--text-muted)" }}>
                        {fmtRelTime(row.updated_time)}
                      </td>
                    )}
                    {visibleColumns.includes("engagement_ranking") && level === "ads" && (
                      <td style={tdMetric("engagement_ranking")}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: ins.engagement_rate_ranking?.includes("ABOVE") ? "rgba(52,183,124,0.15)" : ins.engagement_rate_ranking?.includes("BELOW") ? "rgba(229,72,77,0.15)" : "rgba(224,168,60,0.15)",
                          color: ins.engagement_rate_ranking?.includes("ABOVE") ? "var(--emerald)" : ins.engagement_rate_ranking?.includes("BELOW") ? "var(--red)" : "var(--amber)",
                        }}>
                          {ins.engagement_rate_ranking || "PROMEDIO"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("conversion_ranking") && level === "ads" && (
                      <td style={tdMetric("conversion_ranking")}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: ins.conversion_rate_ranking?.includes("ABOVE") ? "rgba(52,183,124,0.15)" : ins.conversion_rate_ranking?.includes("BELOW") ? "rgba(229,72,77,0.15)" : "rgba(224,168,60,0.15)",
                          color: ins.conversion_rate_ranking?.includes("ABOVE") ? "var(--emerald)" : ins.conversion_rate_ranking?.includes("BELOW") ? "var(--red)" : "var(--amber)",
                        }}>
                          {ins.conversion_rate_ranking || "PROMEDIO"}
                        </span>
                      </td>
                    )}

                    {/* Spacer */}
                    <td style={{ ...tdBase, width: SPACER_W, minWidth: SPACER_W, maxWidth: SPACER_W }} />
                  </tr>
                  {/* ── Breakdown sub-rows ── */}
                                    {breakdownData && selectedBreakdown && selectedBreakdown !== "none" && breakdownData[row.id] && breakdownData[row.id].map((bd: any, bdIdx: number) => {
                    // Determine breakdown label
                    const bdLabel = bd.age ? `${bd.age}${bd.gender ? ` / ${bd.gender}` : ""}` 
                      : bd.publisher_platform ? `${bd.publisher_platform}${bd.platform_position ? ` - ${bd.platform_position}` : ""}`
                      : bd.device_platform || bd.country || bd.region || bd.dma || bd.date_start || bd.hourly_stats_aggregated_by_audience_time_zone || bd.impression_device || bd.image_asset?.name || bd.body_asset?.text?.substring(0, 40) || bd.title_asset?.text || `Row ${bdIdx + 1}`;
                    const bdBg = "rgba(4,12,28,1)";
                    return (
                      <tr key={`${row.id}-bd-${bdIdx}`} style={{ background: "var(--cyan-dim)" }}>
                        <td style={tdFrozen(L_CHECK, CHECKBOX_W, bdBg, false)} />
                        <td style={tdFrozen(L_STATUS, STATUS_W, bdBg, false)} />
                        {showName && (
                          <td style={{ ...tdFrozen(L_NAME, nameW, bdBg, isLastFrozen("name")), padding: "4px 10px 4px 30px", fontSize: 10, color: "rgba(59,130,246,0.7)", fontWeight: 500 }}>
                            ↳ {bdLabel}
                          </td>
                        )}
                        {showDel && <td style={tdFrozen(L_DEL, DELIVERY_W, bdBg, isLastFrozen("delivery"))} />}
                        {showBudg && <td style={tdFrozen(L_BUDG, BUDGET_W, bdBg, isLastFrozen("budget"))} />}
                        {showBid && <td style={tdFrozen(L_BID, BID_W, bdBg, isLastFrozen("bid"))} />}
                        {visibleColumns.filter(c => !["name", "delivery", "budget", "bid"].includes(c)).map((col) => (
                          <td key={col} style={{ ...tdMetric(col), fontSize: 10, color: "var(--text-secondary)" }}>
                            {col === "spend" ? fmt$(bd.spend || 0)
                              : col === "impressions" ? fmtNum(bd.impressions || 0)
                              : col === "clicks" ? fmtNum(bd.clicks || 0)
                              : col === "ctr" ? fmtPct(bd.ctr || 0)
                              : col === "cpc" ? fmt$(bd.cpc || 0)
                              : col === "cpm" ? fmt$(bd.cpm || 0)
                              : col === "reach" ? fmtNum(bd.reach || 0)
                              : col === "frequency" ? fmtDec(bd.frequency || 0)
                              : "—"}
                          </td>
                        ))}
                        <td style={{ ...tdBase, width: SPACER_W, minWidth: SPACER_W, maxWidth: SPACER_W }} />
                      </tr>
                    );
                  })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {sortedData.length > 0 && (
            <tfoot>
              <tr>
                <td style={{ ...tfFrozen(L_CHECK, CHECKBOX_W, statusIsLast) }} />
                <td style={{ ...tfFrozen(L_STATUS, STATUS_W, statusIsLast), color: "var(--foreground)" }}>TOTAL</td>
                {showName && (
                  <td style={{ ...tfFrozen(L_NAME, nameW, isLastFrozen("name")), color: "var(--text-muted)", fontWeight: 400 }}>
                    {sortedData.length} elemento{sortedData.length !== 1 ? "s" : ""}
                  </td>
                )}
                {showDel && <td style={tfFrozen(L_DEL, DELIVERY_W, isLastFrozen("delivery"))} />}
                {showBudg && <td style={tfFrozen(L_BUDG, BUDGET_W, isLastFrozen("budget"))} />}
                {showBid  && <td style={tfFrozen(L_BID, BID_W, isLastFrozen("bid"))} />}
                {visibleColumns.includes("objective") && level === "campaigns" && <td style={tfMetric("objective")} />}
                {visibleColumns.includes("roas") && (
                  <td style={{ ...tfMetric("roas"), color: avgRoas === 0 ? "var(--text-muted)" : avgRoas >= 3 ? "var(--emerald)" : avgRoas >= 1.5 ? "var(--amber)" : "var(--red)" }}>
                    {avgRoas === 0 ? "—" : fmtROAS(avgRoas)}
                  </td>
                )}
                {visibleColumns.includes("learning_phase") && level === "adsets" && <td style={tfMetric("learning_phase")} />}
                {visibleColumns.includes("advantage_plus") && level === "campaigns" && <td style={tfMetric("advantage_plus")} />}
                {visibleColumns.includes("reach") && <td style={tfMetric("reach")}>{fmtNum(totalReach)}</td>}
                {visibleColumns.includes("impressions") && <td style={tfMetric("impressions")}>{fmtNum(totalImpressions)}</td>}
                {visibleColumns.includes("cpm") && <td style={tfMetric("cpm")}>{fmt$(avgCpm)}</td>}
                {visibleColumns.includes("frequency") && <td style={tfMetric("frequency")}>{fmtDec(avgFreq)}</td>}
                {visibleColumns.includes("clicks") && <td style={tfMetric("clicks")}>{fmtNum(totalClicks)}</td>}
                {visibleColumns.includes("ctr") && <td style={tfMetric("ctr")}>{fmtPct(avgCtr)}</td>}
                {visibleColumns.includes("cpc") && <td style={tfMetric("cpc")}>{fmt$(avgCpc)}</td>}
                {visibleColumns.includes("results") && <td style={{ ...tfMetric("results"), color: "var(--foreground)" }}>{fmtNum(totalResults)}</td>}
                {visibleColumns.includes("conversations") && <td style={{ ...tfMetric("conversations"), color: "var(--foreground)" }}>{fmtNum(totalConversations)}</td>}
                {visibleColumns.includes("cost_per_message") && <td style={{ ...tfMetric("cost_per_message"), color: "var(--cyan)" }}>{fmt$(avgCostPerMsg)}</td>}
                {visibleColumns.includes("cost_per_conversation") && <td style={{ ...tfMetric("cost_per_conversation"), color: "var(--cyan)" }}>{fmt$(avgCostPerMsg)}</td>}
                {visibleColumns.includes("cpa") && <td style={{ ...tfMetric("cpa"), color: "var(--cyan)" }}>{fmt$(avgCpa)}</td>}
                {visibleColumns.includes("landing_page_views") && <td style={tfMetric("landing_page_views")}>{fmtNum(totalLPV)}</td>}
                {visibleColumns.includes("hook_rate") && (
                  <td style={{ ...tfMetric("hook_rate"), color: avgHookRate >= 35 ? "var(--emerald)" : avgHookRate >= 20 ? "var(--amber)" : "var(--red)" }}>
                    {avgHookRate > 0 ? fmtPct(avgHookRate) : "—"}
                  </td>
                )}
                {visibleColumns.includes("spend") && <td style={{ ...tfMetric("spend"), color: "var(--foreground)" }}>{fmt$(totalSpend)}</td>}
                {visibleColumns.includes("quality_ranking") && level === "ads" && <td style={tfMetric("quality_ranking")} />}
                {/* ── Ghost columns footer ── */}
                {visibleColumns.includes("purchases") && <td style={{ ...tfMetric("purchases"), color: "var(--foreground)" }}>{totalPurchases > 0 ? fmtNum(totalPurchases) : "—"}</td>}
                {visibleColumns.includes("cost_per_purchase") && <td style={{ ...tfMetric("cost_per_purchase"), color: "var(--cyan)" }}>{avgCPPurchase > 0 ? fmt$(avgCPPurchase) : "—"}</td>}
                {visibleColumns.includes("leads") && <td style={{ ...tfMetric("leads"), color: "var(--foreground)" }}>{totalLeads > 0 ? fmtNum(totalLeads) : "—"}</td>}
                {visibleColumns.includes("cost_per_lead") && <td style={{ ...tfMetric("cost_per_lead"), color: "var(--cyan)" }}>{avgCPLead > 0 ? fmt$(avgCPLead) : "—"}</td>}
                {visibleColumns.includes("outbound_clicks") && <td style={{ ...tfMetric("outbound_clicks"), color: "var(--foreground)" }}>{totalOutboundClicks > 0 ? fmtNum(totalOutboundClicks) : "—"}</td>}
                {visibleColumns.includes("outbound_ctr") && <td style={tfMetric("outbound_ctr")}>{avgOutboundCtr > 0 ? fmtPct(avgOutboundCtr) : "—"}</td>}
                {visibleColumns.includes("unique_ctr") && <td style={tfMetric("unique_ctr")} />}
                {visibleColumns.includes("thruplay") && <td style={{ ...tfMetric("thruplay"), color: "var(--foreground)" }}>{totalThruplay > 0 ? fmtNum(totalThruplay) : "—"}</td>}
                {visibleColumns.includes("thruplay_rate") && <td style={tfMetric("thruplay_rate")}>{avgThruplayRate > 0 ? fmtPct(avgThruplayRate) : "—"}</td>}
                {visibleColumns.includes("cost_per_thruplay") && <td style={{ ...tfMetric("cost_per_thruplay"), color: "var(--cyan)" }}>{avgCPThruplay > 0 ? fmt$(avgCPThruplay) : "—"}</td>}
                {visibleColumns.includes("video_p25") && <td style={{ ...tfMetric("video_p25"), color: "var(--foreground)" }}>{totalVP25 > 0 ? fmtNum(totalVP25) : "—"}</td>}
                {visibleColumns.includes("video_p50") && <td style={{ ...tfMetric("video_p50"), color: "var(--foreground)" }}>{totalVP50 > 0 ? fmtNum(totalVP50) : "—"}</td>}
                {visibleColumns.includes("video_p75") && <td style={{ ...tfMetric("video_p75"), color: "var(--foreground)" }}>{totalVP75 > 0 ? fmtNum(totalVP75) : "—"}</td>}
                {visibleColumns.includes("video_p100") && <td style={{ ...tfMetric("video_p100"), color: "var(--foreground)" }}>{totalVP100 > 0 ? fmtNum(totalVP100) : "—"}</td>}
                {visibleColumns.includes("video_plays") && <td style={{ ...tfMetric("video_plays"), color: "var(--foreground)" }}>{totalVP25 > 0 ? fmtNum(totalVP25) : "—"}</td>}
                {visibleColumns.includes("video_plays_100") && <td style={{ ...tfMetric("video_plays_100"), color: "var(--foreground)" }}>{totalVP100 > 0 ? fmtNum(totalVP100) : "—"}</td>}
                {visibleColumns.includes("add_to_cart") && <td style={{ ...tfMetric("add_to_cart"), color: "var(--foreground)" }}>{totalATC > 0 ? fmtNum(totalATC) : "—"}</td>}
                {visibleColumns.includes("cost_per_atc") && <td style={{ ...tfMetric("cost_per_atc"), color: "var(--cyan)" }}>{avgCPAtc > 0 ? fmt$(avgCPAtc) : "—"}</td>}
                {visibleColumns.includes("initiate_checkout") && <td style={{ ...tfMetric("initiate_checkout"), color: "var(--foreground)" }}>{totalIC > 0 ? fmtNum(totalIC) : "—"}</td>}
                {visibleColumns.includes("cost_per_ic") && <td style={{ ...tfMetric("cost_per_ic"), color: "var(--cyan)" }}>{avgCPIc > 0 ? fmt$(avgCPIc) : "—"}</td>}
                {visibleColumns.includes("bid_strategy") && level !== "ads" && <td style={tfMetric("bid_strategy")} />}
                {visibleColumns.includes("optimization_goal") && level === "adsets" && <td style={tfMetric("optimization_goal")} />}
                {visibleColumns.includes("last_edited") && <td style={tfMetric("last_edited")} />}
                {visibleColumns.includes("engagement_ranking") && level === "ads" && <td style={tfMetric("engagement_ranking")} />}
                {visibleColumns.includes("conversion_ranking") && level === "ads" && <td style={tfMetric("conversion_ranking")} />}
                <td style={{ ...tfBase, width: SPACER_W, minWidth: SPACER_W, maxWidth: SPACER_W }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
