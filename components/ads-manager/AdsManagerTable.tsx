import React, { useCallback, useMemo, useRef, useState } from "react";
import { StatusToggle } from "./StatusToggle";
import { InlineEditor } from "./InlineEditor";
import { ExternalLink, Plus, Pencil, ArrowUp, ArrowDown, ChevronsUpDown, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import {
  OBJECTIVE_MAP, LEARNING_PHASE_MAP, SW_STATUS,
  calcROAS, calcCPA, calcHookRate, calcLandingPageViews,
  frequencyAlertLevel, isAdvantagePlus, findActionValue,
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
}

// ── Number helpers ──────────────────────────────────────────────────────────
const safeFloat = (v: any, fallback = 0) => { const n = parseFloat(v); return isFinite(n) ? n : fallback; };
const safeInt   = (v: any, fallback = 0) => { const n = parseInt(v, 10); return isFinite(n) ? n : fallback; };
const fmt$   = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;
const fmtDec = (n: number) => n.toFixed(2);

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
const TH_BORDER_BOTTOM = "2px solid rgba(0,212,255,0.45)";
const TF_BORDER_TOP    = "2px solid rgba(0,212,255,0.55)";

// ── Action helpers ──────────────────────────────────────────────────────────
function findResultsValue(actions: any[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const priority = [
    "onsite_conversion.messaging_conversation_started_7d",
    "lead", "omni_purchase", "purchase", "complete_registration",
    "add_to_cart", "link_click",
  ];
  for (const type of priority) {
    const a = actions.find((x: any) => x.action_type === type);
    if (a) return parseInt(a.value || "0", 10);
  }
  return 0;
}

function getResultsLabel(actions: any[]): string {
  if (!actions || !Array.isArray(actions)) return "";
  const map: Record<string, string> = {
    "onsite_conversion.messaging_conversation_started_7d": "Conversaciones",
    lead: "Leads", omni_purchase: "Compras", purchase: "Compras",
    complete_registration: "Registros", add_to_cart: "Carritos",
    link_click: "Clics al enlace",
  };
  const priority = Object.keys(map);
  for (const type of priority) {
    if (actions.find((x: any) => x.action_type === type)) return map[type];
  }
  return "";
}

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
        case "results":    valA = findResultsValue(insA.actions); valB = findResultsValue(insB.actions); break;
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
  const defaultWidths: Record<string, number> = {
    name: NAME_W_DEFAULT,
    reach: 110, impressions: 120, cpm: 110, frequency: 110,
    clicks: 100, ctr: 90, cpc: 90, results: 110,
    conversations: 140, cost_per_message: 150, cost_per_conversation: 170,
    cpa: 150, spend: 140, quality_ranking: 130,
    roas: 110, objective: 140, landing_page_views: 130, hook_rate: 120,
    learning_phase: 160, advantage_plus: 110,
  };
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
    ];
    for (const m of metricOrder) {
      if (m.condition) cols.push({ key: m.key, width: colWidths[m.key] ?? defaultWidths[m.key] ?? 120 });
    }
    cols.push({ key: "_spacer", width: SPACER_W });
    return cols;
  }, [showName, showDel, showBudg, showBid, nameW, visibleColumns, level, colWidths, defaultWidths]);

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
  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 inline-block ml-1" style={{ opacity: 0.3 }} />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 inline-block ml-1" style={{ color: "var(--cyan)" }} />;
    return <ArrowDown className="w-3 h-3 inline-block ml-1" style={{ color: "var(--cyan)" }} />;
  };

  // ── Resize handle ─────────────────────────────────────────────────────────
  const ResizeHandle = ({ col }: { col: string }) => (
    <div
      onMouseDown={e => startResize(col, e)}
      style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 5,
        cursor: "col-resize", background: "transparent", zIndex: 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.3)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    />
  );

  // ── Compute totals ────────────────────────────────────────────────────────
  let totalSpend = 0, totalImpressions = 0, totalClicks = 0;
  let totalResults = 0, totalConversations = 0, totalReach = 0;
  let totalLPV = 0;
  let totalPurchaseValue = 0;
  let totalVideo3s = 0;

  sortedData.forEach(row => {
    const ins = row.insights || {};
    totalSpend         += safeFloat(ins.spend);
    totalImpressions   += safeInt(ins.impressions);
    totalClicks        += safeInt(ins.clicks);
    totalResults       += findResultsValue(ins.actions);
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
  });
  const avgCtr        = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc        = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCpm        = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgCpa        = totalResults > 0 ? totalSpend / totalResults : 0;
  const avgCostPerMsg = totalConversations > 0 ? totalSpend / totalConversations : 0;
  const avgFreq       = totalReach > 0 ? totalImpressions / totalReach : 0;
  const avgRoas       = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;
  const avgHookRate   = totalImpressions > 0 ? (totalVideo3s / totalImpressions) * 100 : 0;

  // ── Helper: Sortable header cell for metrics ──────────────────────────────
  const MetricTh = ({ col, label }: { col: string; label: string }) => (
    visibleColumns.includes(col) ? (
      <th
        style={{ ...thMetric(col), position: "sticky", top: 0 }}
        onClick={() => handleSort(col)}
      >
        {label} <SortIcon col={col} /> <ResizeHandle col={col} />
      </th>
    ) : null
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "rgba(8,12,24,0.4)",
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
        style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0, minWidth: 0 }}
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
                <SortIcon col="status" />
              </th>

              {/* ── FROZEN: Name ── */}
              {showName && (
                <th
                  style={{ ...thFrozen(L_NAME, nameW, isLastFrozen("name")), position: "sticky" }}
                  onClick={() => handleSort("name")}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                    {level === "campaigns" ? "CAMPAÑA" : level === "adsets" ? "CONJUNTO" : "ANUNCIO"}
                    <SortIcon col="name" />
                  </span>
                  <div
                    onMouseDown={e => startResize("name", e)}
                    style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, cursor: "col-resize", background: "transparent", zIndex: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,212,255,0.3)")}
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
                  PRESUPUESTO <SortIcon col="budget" />
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
                  OBJETIVO <SortIcon col="objective" /> <ResizeHandle col="objective" />
                </th>
              )}

              {/* ROAS */}
              <MetricTh col="roas" label="ROAS" />

              {/* Learning Phase (adsets only) */}
              {visibleColumns.includes("learning_phase") && level === "adsets" && (
                <th style={{ ...thMetric("learning_phase"), position: "sticky", top: 0 }}>
                  FASE <ResizeHandle col="learning_phase" />
                </th>
              )}

              {/* Advantage+ (campaigns only) */}
              {visibleColumns.includes("advantage_plus") && level === "campaigns" && (
                <th style={{ ...thMetric("advantage_plus"), position: "sticky", top: 0 }}>
                  ADV+ <ResizeHandle col="advantage_plus" />
                </th>
              )}

              <MetricTh col="reach" label="ALCANCE" />
              <MetricTh col="impressions" label="IMPRESIONES" />
              <MetricTh col="cpm" label="CPM" />
              <MetricTh col="frequency" label="FRECUENCIA" />
              <MetricTh col="clicks" label="CLICS" />
              <MetricTh col="ctr" label="CTR" />
              <MetricTh col="cpc" label="CPC" />
              <MetricTh col="results" label="RESULTADOS" />
              <MetricTh col="conversations" label="CONV." />
              <MetricTh col="cost_per_message" label="COSTO / MSG" />
              <MetricTh col="cost_per_conversation" label="COSTO / CONV" />
              <MetricTh col="cpa" label="CPA" />
              <MetricTh col="landing_page_views" label="LANDING VIEWS" />
              <MetricTh col="hook_rate" label="HOOK RATE" />
              <MetricTh col="spend" label="IMPORTE GASTADO" />

              {visibleColumns.includes("quality_ranking") && level === "ads" && (
                <th style={{ ...thMetric("quality_ranking"), position: "sticky", top: 0 }}>
                  CALIDAD <ResizeHandle col="quality_ranking" />
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
                <td
                  colSpan={visibleColumns.length + 6}
                  style={{ padding: 32, textAlign: "center", color: "rgba(148,163,184,0.4)", fontSize: 12 }}
                >
                  No se encontraron elementos. Selecciona una cuenta publicitaria y sincroniza.
                </td>
              </tr>
            ) : (
              sortedData.map(row => {
                const isSelected   = selectedIds.includes(row.id);
                const ins          = row.insights || {};
                const resultsCount = findResultsValue(ins.actions);
                const resultsLabel = getResultsLabel(ins.actions);
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
                                background: "rgba(30,40,60,0.8)",
                                border: "1px solid rgba(100,120,150,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 8, color: "rgba(148,163,184,0.3)",
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
                                    background: "rgba(0,129,251,0.12)",
                                    border: "1px solid rgba(0,212,255,0.2)",
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
                            <span style={{ fontSize: 9, color: "rgba(148,163,184,0.4)", display: "flex", alignItems: "center", gap: 4 }}>
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
                          const sw = SW_STATUS[effStatus] || SW_STATUS[row.status] || { label: effStatus, color: "#6b7280", glow: "rgba(107,114,128,0.3)" };
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
                            <span style={{ fontSize: 8, color: "rgba(148,163,184,0.4)", textTransform: "uppercase" }}>
                              {hasDaily ? "Diario" : "Total"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>Usando CBO</span>
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
                          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>Automático</span>
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
                          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>{row.objective || "—"}</span>
                        )}
                      </td>
                    )}

                    {/* ROAS */}
                    {visibleColumns.includes("roas") && (
                      <td style={tdMetric("roas")}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: roas === 0 ? "rgba(148,163,184,0.4)"
                            : roas >= 3 ? "#34d399"
                            : roas >= 1.5 ? "#fbbf24"
                            : "#ef4444",
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
                          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.3)" }}>—</span>
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
                            background: "rgba(168,85,247,0.15)", color: "#c084fc",
                            border: "1px solid rgba(168,85,247,0.25)",
                          }}>
                            <Zap className="w-3 h-3" /> ADV+
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.3)" }}>—</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes("reach") && (
                      <td style={{ ...tdMetric("reach"), color: "#cbd5e1" }}>{fmtNum(reach)}</td>
                    )}
                    {visibleColumns.includes("impressions") && (
                      <td style={{ ...tdMetric("impressions"), color: "#cbd5e1" }}>{fmtNum(impressions)}</td>
                    )}
                    {visibleColumns.includes("cpm") && (
                      <td style={{ ...tdMetric("cpm"), color: "#cbd5e1" }}>{fmt$(safeFloat(ins.cpm))}</td>
                    )}
                    {visibleColumns.includes("frequency") && (
                      <td style={{
                        ...tdMetric("frequency"),
                        color: freqAlert === "critical" ? "#ef4444"
                          : freqAlert === "warning" ? "#fbbf24"
                          : "#cbd5e1",
                        fontWeight: freqAlert !== "none" ? 700 : undefined,
                      }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {fmtDec(freq)}
                          {freqAlert === "critical" && <AlertTriangle className="w-3 h-3" style={{ color: "#ef4444", animation: "pulse 1.5s infinite" }} />}
                          {freqAlert === "warning" && <AlertTriangle className="w-3 h-3" style={{ color: "#fbbf24" }} />}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("clicks") && (
                      <td style={{ ...tdMetric("clicks"), color: "#cbd5e1" }}>{fmtNum(safeInt(ins.clicks))}</td>
                    )}
                    {visibleColumns.includes("ctr") && (
                      <td style={{ ...tdMetric("ctr"), color: "#cbd5e1" }}>{fmtPct(safeFloat(ins.ctr))}</td>
                    )}
                    {visibleColumns.includes("cpc") && (
                      <td style={{ ...tdMetric("cpc"), color: "#cbd5e1" }}>{fmt$(safeFloat(ins.cpc))}</td>
                    )}
                    {visibleColumns.includes("results") && (
                      <td style={tdMetric("results")}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "white" }}>{fmtNum(resultsCount)}</span>
                          <span style={{ fontSize: 9, color: "rgba(148,163,184,0.4)" }}>{resultsLabel}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("conversations") && (
                      <td style={{ ...tdMetric("conversations"), color: "white", fontWeight: 600 }}>{fmtNum(convsCount)}</td>
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
                          <span style={{ fontSize: 8, color: "rgba(148,163,184,0.4)" }}>{cpa.label}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("landing_page_views") && (
                      <td style={{ ...tdMetric("landing_page_views"), color: "#cbd5e1" }}>{lpv > 0 ? fmtNum(lpv) : "—"}</td>
                    )}
                    {visibleColumns.includes("hook_rate") && (
                      <td style={tdMetric("hook_rate")}>
                        {hookRate > 0 ? (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: hookRate >= 35 ? "#34d399" : hookRate >= 20 ? "#fbbf24" : "#ef4444",
                          }}>
                            {fmtPct(hookRate)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.3)" }}>—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes("spend") && (
                      <td style={tdMetric("spend")}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "white" }}>{fmt$(spend)}</span>
                      </td>
                    )}
                    {visibleColumns.includes("quality_ranking") && level === "ads" && (
                      <td style={tdMetric("quality_ranking")}>
                        <span
                          style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                            background: ins.quality_ranking?.includes("ABOVE")
                              ? "rgba(6,214,160,0.15)"
                              : ins.quality_ranking?.includes("BELOW")
                              ? "rgba(255,45,85,0.15)"
                              : "rgba(255,190,11,0.15)",
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
                      <tr key={`${row.id}-bd-${bdIdx}`} style={{ background: "rgba(0,212,255,0.02)" }}>
                        <td style={tdFrozen(L_CHECK, CHECKBOX_W, bdBg, false)} />
                        <td style={tdFrozen(L_STATUS, STATUS_W, bdBg, false)} />
                        {showName && (
                          <td style={{ ...tdFrozen(L_NAME, nameW, bdBg, isLastFrozen("name")), padding: "4px 10px 4px 30px", fontSize: 10, color: "rgba(0,212,255,0.7)", fontWeight: 500 }}>
                            ↳ {bdLabel}
                          </td>
                        )}
                        {showDel && <td style={tdFrozen(L_DEL, DELIVERY_W, bdBg, isLastFrozen("delivery"))} />}
                        {showBudg && <td style={tdFrozen(L_BUDG, BUDGET_W, bdBg, isLastFrozen("budget"))} />}
                        {showBid && <td style={tdFrozen(L_BID, BID_W, bdBg, isLastFrozen("bid"))} />}
                        {visibleColumns.filter(c => !["name", "delivery", "budget", "bid"].includes(c)).map((col) => (
                          <td key={col} style={{ ...tdMetric(col), fontSize: 10, color: "rgba(148,163,184,0.6)" }}>
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
                <td style={{ ...tfFrozen(L_STATUS, STATUS_W, statusIsLast), color: "white" }}>TOTAL</td>
                {showName && (
                  <td style={{ ...tfFrozen(L_NAME, nameW, isLastFrozen("name")), color: "rgba(148,163,184,0.5)", fontWeight: 400 }}>
                    {sortedData.length} elemento{sortedData.length !== 1 ? "s" : ""}
                  </td>
                )}
                {showDel && <td style={tfFrozen(L_DEL, DELIVERY_W, isLastFrozen("delivery"))} />}
                {showBudg && <td style={tfFrozen(L_BUDG, BUDGET_W, isLastFrozen("budget"))} />}
                {showBid  && <td style={tfFrozen(L_BID, BID_W, isLastFrozen("bid"))} />}
                {visibleColumns.includes("objective") && level === "campaigns" && <td style={tfMetric("objective")} />}
                {visibleColumns.includes("roas") && (
                  <td style={{ ...tfMetric("roas"), color: avgRoas === 0 ? "rgba(148,163,184,0.4)" : avgRoas >= 3 ? "#34d399" : avgRoas >= 1.5 ? "#fbbf24" : "#ef4444" }}>
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
                {visibleColumns.includes("results") && <td style={{ ...tfMetric("results"), color: "white" }}>{fmtNum(totalResults)}</td>}
                {visibleColumns.includes("conversations") && <td style={{ ...tfMetric("conversations"), color: "white" }}>{fmtNum(totalConversations)}</td>}
                {visibleColumns.includes("cost_per_message") && <td style={{ ...tfMetric("cost_per_message"), color: "var(--cyan)" }}>{fmt$(avgCostPerMsg)}</td>}
                {visibleColumns.includes("cost_per_conversation") && <td style={{ ...tfMetric("cost_per_conversation"), color: "var(--cyan)" }}>{fmt$(avgCostPerMsg)}</td>}
                {visibleColumns.includes("cpa") && <td style={{ ...tfMetric("cpa"), color: "var(--cyan)" }}>{fmt$(avgCpa)}</td>}
                {visibleColumns.includes("landing_page_views") && <td style={tfMetric("landing_page_views")}>{fmtNum(totalLPV)}</td>}
                {visibleColumns.includes("hook_rate") && (
                  <td style={{ ...tfMetric("hook_rate"), color: avgHookRate >= 35 ? "#34d399" : avgHookRate >= 20 ? "#fbbf24" : "#ef4444" }}>
                    {avgHookRate > 0 ? fmtPct(avgHookRate) : "—"}
                  </td>
                )}
                {visibleColumns.includes("spend") && <td style={{ ...tfMetric("spend"), color: "white" }}>{fmt$(totalSpend)}</td>}
                {visibleColumns.includes("quality_ranking") && level === "ads" && <td style={tfMetric("quality_ranking")} />}
                <td style={{ ...tfBase, width: SPACER_W, minWidth: SPACER_W, maxWidth: SPACER_W }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
