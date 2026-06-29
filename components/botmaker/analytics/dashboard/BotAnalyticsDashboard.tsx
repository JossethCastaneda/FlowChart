"use client";

/**
 * Bot Analytics — single-screen, drag-and-drop, resizable BI dashboard.
 * Owns time range, channel filter, time granularity, edit/layout (localStorage),
 * and data fetching. Composes DashboardGrid + the widget registry.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  RefreshCw, Loader2, Calendar, ChevronDown, LayoutGrid, Plus, RotateCcw, Check, Filter, AlertCircle,
  ArrowLeft, Smartphone,
} from "lucide-react";
import DashboardGrid, { GridItem } from "./DashboardGrid";
import { WIDGETS, DEFAULT_LAYOUT, LayoutCell, WidgetCtx } from "./widgets";
import type { DashboardData, Granularity } from "@/lib/botmaker/insights";
import { cdmxRange, cdmxDayStartISO, cdmxDayEndISO } from "@/lib/crm/timezone";

const LS_KEY = "botmaker-dashboard-layout-v6";
const LS_FILTERS_KEY = "botmaker-dashboard-filters-v2";
const P = "var(--purple)";

type Period = "Hoy" | "7 días" | "30 días" | "custom";
type ApiData = DashboardData & {
  channelOptions: { id: string; name: string; platform: string }[];
  channelScope?: { projectId: string | null; autoScoped: boolean; resolved: number };
};

// Ventanas de descarga ancladas a días CDMX (America/Mexico_City). Botmaker
// recibe instantes UTC, así que enviamos el UTC que corresponde a la medianoche
// CDMX (00:00 CDMX = 06:00 UTC). Centralizado en lib/crm/timezone para que
// "últimos 7/30 días" signifique lo mismo aquí, en Cari y en el dashboard.
function dateRange(period: Period, cf: string, ct: string): { from: string; to: string } {
  if (period === "custom" && cf && ct) {
    return { from: cdmxDayStartISO(cf), to: cdmxDayEndISO(ct) };
  }
  const r = cdmxRange(period === "Hoy" ? 1 : period === "7 días" ? 7 : 30);
  return { from: r.fromISO, to: r.toISO };
}

function loadLayout(key: string): LayoutCell[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as LayoutCell[];
    const valid = parsed.filter((c) => WIDGETS[c.id] && typeof c.x === "number" && typeof c.y === "number");
    return valid.length ? valid : DEFAULT_LAYOUT;
  } catch { return DEFAULT_LAYOUT; }
}

interface BotAnalyticsDashboardProps {
  /** Embeds the dashboard inside a project, auto-scoped to its Botmaker channels. */
  projectId?: string;
  /** Hide the standalone Botmaker chrome (breadcrumb, Portabilidad link). */
  embedded?: boolean;
}

export default function BotAnalyticsDashboard({ projectId, embedded = false }: BotAnalyticsDashboardProps = {}) {
  // Namespace localStorage by project so cada proyecto recuerda su layout/filtros
  // sin pisar el tablero global de /dashboard/botmaker/analytics.
  const ns = projectId ? `::${projectId}` : "";
  const lsKey = LS_KEY + ns;
  const lsFiltersKey = LS_FILTERS_KEY + ns;

  const [period, setPeriod] = useState<Period>("Hoy");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [channelId, setChannelId] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [includeTest, setIncludeTest] = useState(false);

  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<LayoutCell[]>(DEFAULT_LAYOUT);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  // hydrate layout from localStorage (client only)
  useEffect(() => { setLayout(loadLayout(lsKey)); }, [lsKey]);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(lsKey, JSON.stringify(layout));
  }, [layout, lsKey]);

  // hydrate filters from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(lsFiltersKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.period) setPeriod(p.period);
        if (p.customFrom) setCustomFrom(p.customFrom);
        if (p.customTo) setCustomTo(p.customTo);
        if (p.channelId !== undefined) setChannelId(p.channelId);
        if (p.granularity) setGranularity(p.granularity);
        if (typeof p.includeTest === "boolean") setIncludeTest(p.includeTest);
      }
    } catch {}
  }, [lsFiltersKey]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(lsFiltersKey, JSON.stringify({ period, customFrom, customTo, channelId, granularity, includeTest }));
    }
  }, [period, customFrom, customTo, channelId, granularity, includeTest, lsFiltersKey]);

  // default granularity when switching to "Hoy"
  useEffect(() => { if (period === "Hoy") setGranularity("hour"); else if (granularity === "hour") setGranularity("day"); /* eslint-disable-next-line */ }, [period]);

  // close period dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (periodRef.current && !periodRef.current.contains(e.target as Node)) setPeriodOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const { from, to } = useMemo(() => dateRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ from, to });
      if (channelId) qs.set("channelId", channelId);
      if (projectId) qs.set("projectId", projectId);
      if (includeTest) qs.set("includeTest", "true");
      if (forceRefresh) qs.set("forceRefresh", "true");
      const res = await fetch(`/api/botmaker/analytics/dashboard?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || `HTTP ${res.status}`);
      const payload = json.data as ApiData;
      setData(payload);
      // Si el canal recordado ya no pertenece al proyecto (selector acotado), límpialo.
      if (channelId && !(payload.channelOptions || []).some((c) => c.id === channelId)) {
        setChannelId("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setData(null);
    } finally { setLoading(false); }
  }, [from, to, channelId, projectId, includeTest]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const gridItems: GridItem[] = useMemo(
    () => layout.filter((c) => WIDGETS[c.id]).map((c) => {
      const def = WIDGETS[c.id];
      return { id: c.id, title: def.title, x: c.x, y: c.y, w: c.w, h: c.h, minW: def.size.minW, minH: def.size.minH };
    }),
    [layout]
  );

  const onGridChange = useCallback((items: GridItem[]) => {
    setLayout(items.map((i) => ({ id: i.id, x: i.x, y: i.y, w: i.w, h: i.h })));
  }, []);

  const removeWidget = useCallback((id: string) => setLayout((l) => l.filter((c) => c.id !== id)), []);
  const resetLayout = useCallback(() => setLayout(DEFAULT_LAYOUT), []);
  const addWidget = useCallback((id: string) => {
    const def = WIDGETS[id];
    setLayout((l) => {
      if (l.some((c) => c.id === id)) return l;
      const maxY = l.reduce((m, c) => Math.max(m, c.y + c.h), 0);
      return [...l, { id, x: 0, y: maxY, w: def.size.w, h: def.size.h }];
    });
  }, []);

  const ctx: WidgetCtx | null = data ? { data, granularity, setGranularity } : null;
  const hiddenWidgets = Object.values(WIDGETS).filter((w) => !layout.some((c) => c.id === w.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#030508", overflow: "hidden" }}>
      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,7,18,0.9)", flexShrink: 0, flexWrap: "wrap" }}>
        {!embedded && (
          <>
            <Link href="/dashboard/botmaker" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(148,163,184,0.5)", textDecoration: "none" }}>
              <ArrowLeft style={{ width: 12, height: 12 }} /> Botmaker
            </Link>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>›</span>
          </>
        )}
        <LayoutGrid style={{ width: 15, height: 15, color: P }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{embedded ? "Métricas del Bot · Portabilidad" : "Portabilidad · Cambios de compañía"}</span>
        {data && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>· {data.kpis.sessions.toLocaleString("es-MX")} conversaciones</span>}

        <div style={{ flex: 1 }} />

        {!embedded && (
          <Link href="/dashboard/botmaker/analytics/portabilidad" style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 20, color: "var(--cyan)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
            <Smartphone style={{ width: 12, height: 12 }} /> Análisis de portabilidad
          </Link>
        )}

        {/* Channel filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter style={{ width: 13, height: 13, color: "rgba(255,255,255,0.4)" }} />
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} style={selStyle}>
            <option value="">{projectId ? "Todos los canales del proyecto" : "Todos los bots / canales"}</option>
            {(data?.channelOptions || []).map((c) => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
          </select>
        </div>

        {/* Incluir bots de prueba en el agregado (por defecto se excluyen) */}
        <button
          onClick={() => setIncludeTest((v) => !v)}
          title="Incluir bots de prueba/QA en las métricas agregadas"
          style={{ ...pillStyle, background: includeTest ? `${P}22` : "rgba(255,255,255,0.05)", borderColor: includeTest ? `${P}70` : "rgba(255,255,255,0.12)", color: includeTest ? "var(--purple)" : "rgba(255,255,255,0.6)" }}
        >
          {includeTest ? "Con bots de prueba" : "Solo producción"}
        </button>

        {/* Period */}
        <div ref={periodRef} style={{ position: "relative" }}>
          <button onClick={() => setPeriodOpen((o) => !o)} style={pillStyle}>
            <Calendar style={{ width: 12, height: 12 }} />
            {period === "custom" && customFrom && customTo ? `${customFrom} → ${customTo}` : period}
            <ChevronDown style={{ width: 11, height: 11, opacity: 0.6 }} />
          </button>
          {periodOpen && (
            <div style={dropdownStyle}>
              {(["Hoy", "7 días", "30 días"] as Period[]).map((p) => (
                <button key={p} onClick={() => { setPeriod(p); setPeriodOpen(false); }} style={dropItem(period === p)}>{p}</button>
              ))}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 6, paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 6, paddingLeft: 4 }}>RANGO PERSONALIZADO</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={dateInput} />
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={dateInput} />
                </div>
                {customFrom && customTo && (
                  <button onClick={() => { setPeriod("custom"); setPeriodOpen(false); }} style={{ marginTop: 8, width: "100%", padding: "6px 0", background: P, border: "none", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Aplicar</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit toggle */}
        <button onClick={() => setEditing((e) => !e)} style={{ ...pillStyle, background: editing ? `${P}22` : "rgba(255,255,255,0.05)", borderColor: editing ? `${P}70` : "rgba(255,255,255,0.12)", color: editing ? "var(--purple)" : "rgba(255,255,255,0.7)" }}>
          {editing ? <Check style={{ width: 12, height: 12 }} /> : <LayoutGrid style={{ width: 12, height: 12 }} />}
          {editing ? "Listo" : "Editar tablero"}
        </button>

        {/* Refresh */}
        <button onClick={() => fetchData(true)} disabled={loading} style={{ ...pillStyle, background: "rgba(168,85,247,0.1)", borderColor: "rgba(168,85,247,0.3)", color: "var(--purple)", opacity: loading ? 0.6 : 1 }}>
          <RefreshCw style={{ width: 11, height: 11 }} className={loading ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      {/* ── Edit palette ── */}
      {editing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", background: "rgba(168,85,247,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Arrastra por el encabezado · redimensiona desde la esquina.</span>
          {hiddenWidgets.map((w) => (
            <button key={w.id} onClick={() => addWidget(w.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, color: "rgba(255,255,255,0.7)", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
              <Plus style={{ width: 11, height: 11 }} /> {w.title.split(" · ")[0]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={resetLayout} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, color: "var(--red)", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
            <RotateCcw style={{ width: 11, height: 11 }} /> Restablecer
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading && !data && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 80 }}>
            <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: P }} />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Analizando comportamiento del bot…</span>
          </div>
        )}
        {error && !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 24, color: "var(--red)", fontSize: 13, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12 }}>
            <AlertCircle style={{ width: 18, height: 18 }} /> {error}
          </div>
        )}
        {embedded && data?.channelScope && !data.channelScope.autoScoped && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, color: "var(--amber)", fontSize: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10 }}>
            <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
            No se detectaron canales de Botmaker para este proyecto; mostrando todo el workspace. Asocia los canales del bot en <b style={{ margin: "0 3px" }}>Configuración</b> para acotar automáticamente.
          </div>
        )}
        {ctx && (
          <DashboardGrid
            items={gridItems}
            onChange={onGridChange}
            onRemove={removeWidget}
            editable={editing}
            accent={P}
            renderItem={(id) => (WIDGETS[id] ? WIDGETS[id].render(ctx) : null)}
          />
        )}
      </div>
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const pillStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 20, color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none",
};
const selStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff",
  padding: "5px 10px", borderRadius: 8, fontSize: 11, outline: "none", maxWidth: 220,
};
const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100, background: "var(--background)",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 8, minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};
const dropItem = (active: boolean): React.CSSProperties => ({
  display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
  background: active ? "rgba(168,85,247,0.15)" : "transparent", border: "none", borderRadius: 8,
  color: active ? "var(--purple)" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
});
const dateInput: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
  color: "rgba(255,255,255,0.7)", fontSize: 11, padding: "4px 8px", outline: "none", colorScheme: "dark", width: "100%",
};
