"use client";

/**
 * Widget registry for the Bot Analytics dashboard. Each widget is a pure render
 * over a slice of DashboardData. The shell places them in the drag-and-drop grid.
 */
import React from "react";
import {
  Area, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Bot, Users, Zap, AlertTriangle, RefreshCw, Clock, Target,
  TrendingDown, TrendingUp, Activity, ShieldAlert, Layers, Lightbulb, ShieldCheck,
} from "lucide-react";
import type {
  DashboardData, Granularity, TimeBucket, BreakpointRow, ButtonRow, NamedCount, KpiDelta, Opportunity,
} from "@/lib/botmaker/insights";
import type { OutcomeRow } from "@/lib/botmaker/outcomes";
import { CATEGORY_COLOR } from "@/lib/botmaker/outcomes";
import type { CaptureFunnelStep } from "@/lib/botmaker/fields";
import type { BotPerf, CoverageInfo } from "@/lib/botmaker/bot-perf";

// ── tokens ───────────────────────────────────────────────────────────────────
const P = "var(--purple)", C = "var(--cyan)", G = "var(--emerald)", R = "var(--red)", A = "var(--amber)", B = "var(--cyan)";
const SERIES = [P, C, G, A, R, B, "var(--red)", "var(--purple)", "var(--emerald)", "var(--amber)"];
const TT = { background: "var(--background)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 11 } as const;
const muted = "rgba(255,255,255,0.45)";

const fmt = (n: number) => (n ?? 0).toLocaleString("es-MX");
const pctTxt = (n: number) => `${n ?? 0}%`;
const secTxt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s ?? 0}s`);

export interface WidgetCtx {
  data: DashboardData;
  granularity: Granularity;
  setGranularity: (g: Granularity) => void;
}
export interface WidgetDef {
  id: string;
  title: string;
  size: { w: number; h: number; minW: number; minH: number };
  render: (ctx: WidgetCtx) => React.ReactNode;
}

// ── shared primitives ──────────────────────────────────────────────────────────

function Empty({ msg = "Sin datos en el periodo" }: { msg?: string }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: muted, fontSize: 12 }}>{msg}</div>;
}

const Col: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 10 }) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", gap, minHeight: 0 }}>{children}</div>
);

function Kpi({ label, value, sub, accent = P, icon, trend }: { label: string; value: string | number; sub?: string; accent?: string; icon?: React.ReactNode; trend?: KpiDelta }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 128, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}28`, borderRadius: 10, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10.5, color: muted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ color: accent, opacity: 0.7, display: "flex" }}>{icon}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 23, fontWeight: 800, color: accent, lineHeight: 1.05 }}>{value}</span>
        <DeltaChip d={trend} />
      </div>
      {sub && <span style={{ fontSize: 10.5, color: muted }}>{sub}</span>}
    </div>
  );
}

/** Horizontal labeled bar list. */
function BarList({ rows, color = P, suffix = "", max }: { rows: { label: string; value: number; hint?: string }[]; color?: string | ((i: number) => string); suffix?: string; max?: number }) {
  if (!rows.length) return <Empty />;
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((r, i) => {
        const col = typeof color === "function" ? color(i) : color;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.72)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.label}>{r.label}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: col, flexShrink: 0 }}>{fmt(r.value)}{suffix} {r.hint && <span style={{ color: muted, fontWeight: 400 }}>{r.hint}</span>}</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (r.value / top) * 100)}%`, height: "100%", background: col, borderRadius: 3 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ChartBox: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <div style={{ flex: 1, minHeight: 0 }}>
    <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
  </div>
);

// ── widgets ────────────────────────────────────────────────────────────────────

const KpisWidget = ({ data }: WidgetCtx) => {
  const k = data.kpis;
  const d = data.kpiDeltas;
  // "Cambio de compañía completado" = conteo exacto de ventas (outcome canónico).
  const completed = data.outcomes.find((o) => o.key === "venta")?.count ?? 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <Kpi label="Conversaciones" value={fmt(k.sessions)} accent={P} icon={<Bot size={14} />} sub={`${fmt(k.users)} usuarios únicos`} trend={d?.sessions} />
      <Kpi label="Cambios completados" value={fmt(completed)} accent={G} icon={<Target size={14} />} sub="portabilidad exitosa" trend={d?.conversionRate} />
      <Kpi label="Tasa de portabilidad" value={pctTxt(k.conversionRate)} accent={G} icon={<TrendingUp size={14} />} sub="de las conversaciones" trend={d?.conversionRate} />
      <Kpi label="Atención humana" value={pctTxt(k.agentRate)} accent={A} icon={<Users size={14} />} sub="escalan a un agente" trend={d?.agentRate} />
      <Kpi label="No entendidas" value={pctTxt(k.fallbackRate)} accent={R} icon={<AlertTriangle size={14} />} sub="el bot no comprende" trend={d?.fallbackRate} />
      <Kpi label="Reintentos de captura" value={pctTxt(k.retryRate)} accent={A} icon={<RefreshCw size={14} />} sub="error al pedir datos (NIP, número…)" trend={d?.retryRate} />
      <Kpi label="1ª respuesta" value={secTxt(k.avgFirstResponseSec)} accent={C} icon={<Clock size={14} />} sub="promedio del bot" trend={d?.avgFirstResponseSec} />
      <Kpi label="Cobertura" value={pctTxt(data.coverage.coveragePct)} accent={C} icon={<Zap size={14} />} sub="atribuidas a un bot" />
    </div>
  );
};

const GRAN_LABEL: Record<Granularity, string> = { hour: "Hora", day: "Día", week: "Semana", month: "Mes" };

const TimeseriesWidget = ({ data, granularity, setGranularity }: WidgetCtx) => {
  const series: TimeBucket[] = data.timeseries[granularity] || [];
  return (
    <Col>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {(["hour", "day", "week", "month"] as Granularity[]).map((g) => (
          <button key={g} onClick={() => setGranularity(g)} style={{
            padding: "3px 11px", borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: "pointer", outline: "none",
            border: granularity === g ? `1px solid ${P}70` : "1px solid transparent",
            background: granularity === g ? `${P}22` : "rgba(255,255,255,0.05)",
            color: granularity === g ? "var(--purple)" : muted,
          }}>{GRAN_LABEL[g]}</button>
        ))}
        <div style={{ flex: 1 }} />
        <Legend2 items={[["Sesiones", P], ["Usuarios", C], ["Agentes", A]]} />
      </div>
      {series.length === 0 ? <Empty /> : (
        <ChartBox>
          <ComposedChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gSess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P} stopOpacity={0.5} /><stop offset="100%" stopColor={P} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: muted }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 9, fill: muted }} />
            <Tooltip contentStyle={TT} />
            <Area type="monotone" dataKey="sessions" name="Sesiones" stroke={P} strokeWidth={2} fill="url(#gSess)" />
            <Line type="monotone" dataKey="users" name="Usuarios" stroke={C} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="handoffs" name="Agentes" stroke={A} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ChartBox>
      )}
    </Col>
  );
};

const Legend2 = ({ items }: { items: [string, string][] }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {items.map(([l, c]) => (
      <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: muted }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} /> {l}
      </span>
    ))}
  </div>
);

const FunnelWidget = ({ data }: WidgetCtx) => {
  if (!data.funnel.length || data.kpis.sessions === 0) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.funnel.map((s, i) => (
        <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
            <span style={{ color: "rgba(255,255,255,0.75)" }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: SERIES[i % SERIES.length] }}>{fmt(s.count)} <span style={{ color: muted, fontWeight: 400 }}>({s.pct}%)</span></span>
          </div>
          <div style={{ height: 18, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${s.pct}%`, height: "100%", background: SERIES[i % SERIES.length], opacity: 0.85, borderRadius: 5, transition: "width 0.3s" }} />
          </div>
          {i > 0 && s.dropOff > 0 && (
            <span style={{ fontSize: 10, color: R, display: "flex", alignItems: "center", gap: 3 }}>
              <TrendingDown size={11} /> −{fmt(s.dropOff)} ({s.dropOffPct}% caída)
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const BotVsAgentWidget = ({ data }: WidgetCtx) => {
  const { botSessions, agentSessions } = data.botAgentSplit;
  const total = botSessions + agentSessions;
  if (!total) return <Empty />;
  const d = [
    { name: "Bot", value: botSessions, color: P },
    { name: "Agente", value: agentSessions, color: A },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={d} cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" dataKey="value" stroke="none">
              {d.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={TT} itemStyle={{ fontSize: 12, fontWeight: 700 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {d.map(e => (
          <div key={e.name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, color: muted }}>{e.name}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: e.color }}>
              {Math.round((e.value / total) * 100)}% <span style={{ fontSize: 11, color: muted, fontWeight: 400 }}>({fmt(e.value)})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChannelDistributionWidget = ({ data }: WidgetCtx) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
      <BarList rows={data.channelDistribution.map(c => ({ label: c.platform, value: c.count, hint: `(${c.pct}%)` }))} color={(i) => SERIES[i % SERIES.length]} />
    </div>
  );
};

const BotFlowWidget = ({ data }: WidgetCtx) => {
  const maxPrompts = Math.max(1, ...data.breakpoints.map((b) => b.prompts + b.timeouts));
  const minPrompts = maxPrompts * 0.05; // Only show nodes that reach at least 5% of the max traffic

  const rows: BreakpointRow[] = data.breakpoints
    .filter((b) => (b.prompts + b.timeouts) >= minPrompts && b.avgStep < 999)
    .slice(0, 15);
  if (!rows.length) return <Empty msg="No se detectaron pasos secuenciales" />;

  return (
    <div style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 16, overflow: "auto", height: "100%" }}>
      {rows.map((r, i) => {
        const isLast = i === rows.length - 1;
        const total = r.prompts + r.timeouts;
        const successRate = total ? Math.round(((r.okFirstTry + r.okAfterRetry) / total) * 100) : 0;
        const dropRate = total ? Math.round((r.timeouts / total) * 100) : 0;
        const iaFailRate = total ? Math.round((r.failed / total) * 100) : 0;
        
        let insight = "Paso con validación estándar.";
        let insightColor = muted;
        if (dropRate > 30) { insight = "Alto abandono. Considera simplificar la pregunta o dar opciones."; insightColor = A; }
        else if (iaFailRate > 20) { insight = "Falla de validación frecuente. Revisar los sinónimos o la IA."; insightColor = R; }
        else if (successRate > 80) { insight = "Alta tasa de éxito. El usuario entiende la solicitud."; insightColor = G; }

        return (
          <div key={r.field} style={{ display: "flex", gap: 16, position: "relative" }}>
            {/* Timeline line */}
            {!isLast && <div style={{ position: "absolute", left: 11, top: 24, bottom: -16, width: 2, background: "rgba(255,255,255,0.05)" }} />}
            
            {/* Timeline node */}
            <div style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", zIndex: 1, flexShrink: 0 }}>
              {i + 1}
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{r.field}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 12 }}>
                  {fmt(total)} llegan
                </span>
              </div>
              
              <div style={{ fontSize: 12, color: insightColor, fontWeight: 500 }}>{insight}</div>
              
              <div style={{ display: "flex", gap: 12, marginTop: 4, background: "rgba(0,0,0,0.2)", padding: 8, borderRadius: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>Éxito</div>
                  <div style={{ fontSize: 13, color: G, fontWeight: 600 }}>{successRate}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>Abandono</div>
                  <div style={{ fontSize: 13, color: dropRate > 20 ? A : "rgba(255,255,255,0.8)", fontWeight: 600 }}>{dropRate}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>Fallo (IA)</div>
                  <div style={{ fontSize: 13, color: iaFailRate > 15 ? R : "rgba(255,255,255,0.8)", fontWeight: 600 }}>{iaFailRate}%</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>Reintentos</div>
                  <div style={{ fontSize: 13, color: r.avgAttempts >= 1.5 ? A : "rgba(255,255,255,0.8)", fontWeight: 600 }}>{r.avgAttempts} prom</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FallbackWidget = ({ data }: WidgetCtx) => {
  const fb = data.fallback;
  return (
    <Col>
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <Kpi label="Sesiones c/ fallback" value={fmt(fb.sessions)} accent={R} icon={<AlertTriangle size={14} />} sub={`${fb.rate}% del total`} />
        <Kpi label="Veces 'no entendí'" value={fmt(fb.occurrences)} accent={A} sub="Mensaje por defecto" />
      </div>
      <div style={{ fontSize: 10.5, color: muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>Top mensajes no entendidos</div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {fb.topUnrecognized.length ? (
          <BarList color={R} rows={fb.topUnrecognized.map((u) => ({ label: `"${u.name}"`, value: u.count }))} />
        ) : <Empty msg="Sin fallback registrado 🎉" />}
      </div>
    </Col>
  );
};

const HEAT_LABEL_W = 32;
const HeatmapWidget = ({ data }: WidgetCtx) => {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const max = Math.max(1, ...data.heatmap.flat());
  if (max <= 1 && data.kpis.sessions === 0) return <Empty />;
  // Hora pico (para dar contexto en vez de solo el grid).
  let peak = { d: 0, h: 0, v: 0 };
  data.heatmap.forEach((row, d) => row.forEach((v, h) => { if (v > peak.v) peak = { d, h, v }; }));
  // Celdas de ALTURA FIJA pequeña (antes aspectRatio:1 las hacía cuadrados
  // enormes al ancho completo). Compacto y legible; el ancho lo reparte flex.
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 4, justifyContent: "center", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 2, paddingLeft: HEAT_LABEL_W }}>
        {Array.from({ length: 24 }).map((_, h) => (
          <span key={h} style={{ flex: 1, fontSize: 8.5, color: muted, textAlign: "center" }}>{h % 2 === 0 ? h : ""}</span>
        ))}
      </div>
      {data.heatmap.map((row, d) => (
        <div key={d} style={{ display: "flex", gap: 2, alignItems: "center", height: 18, flexShrink: 0 }}>
          <span style={{ width: HEAT_LABEL_W, fontSize: 10, color: muted, flexShrink: 0 }}>{days[d]}</span>
          {row.map((v, h) => {
            const t = v / max;
            return <div key={h} title={`${days[d]} ${h}:00 — ${v} sesiones`} style={{ flex: 1, height: "100%", borderRadius: 2, minWidth: 0, background: v === 0 ? "rgba(255,255,255,0.04)" : `rgba(168,85,247,${0.18 + t * 0.82})` }} />;
          })}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: HEAT_LABEL_W, marginTop: 4, fontSize: 10, color: muted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          menos
          <span style={{ display: "flex", gap: 2 }}>
            {[0.18, 0.4, 0.6, 0.8, 1].map((o, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 2, background: `rgba(168,85,247,${o})` }} />)}
          </span>
          más
        </span>
        <span style={{ marginLeft: "auto" }}>Pico: <b style={{ color: "rgba(255,255,255,0.8)" }}>{days[peak.d]} {peak.h}:00h</b> · {fmt(peak.v)} conv.</span>
      </div>
    </div>
  );
};

const ChannelsWidget = ({ data }: WidgetCtx) => {
  const rows = data.channels.slice(0, 12);
  if (!rows.length) return <Empty />;
  return (
    <div style={{ overflow: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((c, i) => (
        <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.78)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`${c.name} · ${c.platform}`}>{c.name}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: SERIES[i % SERIES.length], flexShrink: 0 }}>{fmt(c.sessions)} <span style={{ color: muted, fontWeight: 400 }}>({c.pct}%)</span></span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${c.pct}%`, height: "100%", background: SERIES[i % SERIES.length], borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 9.5, color: muted }}>
            <span>agente {c.agentRate}%</span><span style={{ color: c.fallbackRate >= 20 ? R : muted }}>fallback {c.fallbackRate}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const ButtonsWidget = ({ data }: WidgetCtx) => {
  const rows: ButtonRow[] = data.buttons.rows.slice(0, 12);
  if (!rows.length) return <Empty msg="No se mostraron botones" />;
  return (
    <Col gap={8}>
      <div style={{ fontSize: 10.5, color: muted, flexShrink: 0 }}>CTR global de botones: <b style={{ color: C }}>{Math.round(data.buttons.selectRate * 100)}%</b></div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.label}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: r.ctr < 0.15 ? R : r.ctr < 0.4 ? A : G, flexShrink: 0 }}>{Math.round(r.ctr * 100)}%</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, r.ctr * 100)}%`, height: "100%", background: r.ctr < 0.15 ? R : r.ctr < 0.4 ? A : G, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 9, color: muted }}>{fmt(r.shown)} mostrados · {fmt(r.selected)} elegidos</span>
          </div>
        ))}
      </div>
    </Col>
  );
};

const CopiesWidget = ({ data }: WidgetCtx) => (
  data.copies.length
    ? <BarList color={A} suffix="%" rows={data.copies.map((c) => ({ label: c.name, value: c.count, hint: "CTR" }))} max={100} />
    : <Empty msg="Sin copys problemáticos (CTR > 15%)" />
);

const TypificationsWidget = ({ data }: WidgetCtx) => {
  const rows = data.typifications.slice(0, 10);
  if (!rows.length) return <Empty msg="Sin tipificaciones de cierre" />;
  return <BarList color={(i) => SERIES[i % SERIES.length]} rows={rows.map((t) => ({ label: t.name, value: t.count, hint: t.pct != null ? `${t.pct}%` : "" }))} />;
};

const ErrorsWidget = ({ data }: WidgetCtx) => (
  data.errors.length
    ? <BarList color={R} rows={data.errors.map((e) => ({ label: e.name, value: e.count }))} />
    : <Empty msg="Sin errores de entrega 🎉" />
);

const BotsWidget = ({ data }: WidgetCtx) => (
  data.bots.length
    ? <BarList color={(i) => SERIES[i % SERIES.length]} rows={data.bots.map((b) => ({ label: b.name, value: b.count }))} />
    : <Empty msg="Sin enrutamiento entre bots" />
);

const FlowWidget = ({ data }: WidgetCtx) => {
  const rows = data.flowEdges.slice(0, 14);
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ overflow: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((e, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
            <span style={{ maxWidth: "42%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={e.source}>{e.source}</span>
            <span style={{ color: muted }}>→</span>
            <span style={{ maxWidth: "42%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "rgba(255,255,255,0.9)" }} title={e.target}>{e.target}</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: C, flexShrink: 0 }}>{fmt(e.value)}</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${(e.value / max) * 100}%`, height: "100%", background: C, opacity: 0.7, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const VariablesWidget = ({ data }: WidgetCtx) => {
  const v = data.variables;
  if (!v.total) return <Empty msg="No se pudieron leer las variables (/variables)" />;
  return (
    <Col gap={8}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: P }}>{fmt(v.total)} variables</span>
        {v.byType.map((t) => (
          <span key={t.name} style={{ fontSize: 10, color: muted, background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "2px 8px" }}>{t.name}: {t.count}</span>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <BarList color={(i) => SERIES[i % SERIES.length]} rows={v.byCategory.slice(0, 16).map((c) => ({ label: c.category, value: c.count, hint: c.names.slice(0, 3).join(", ") }))} />
      </div>
    </Col>
  );
};

const SEV: Record<string, { c: string; icon: React.ReactNode }> = {
  critical: { c: R, icon: <ShieldAlert size={14} /> },
  warning: { c: A, icon: <AlertTriangle size={14} /> },
  ok: { c: G, icon: <Activity size={14} /> },
  info: { c: C, icon: <Layers size={14} /> },
};
const InsightsWidget = ({ data }: WidgetCtx) => {
  if (!data.insights.length) return <Empty />;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, height: "100%", overflow: "auto", alignContent: "flex-start" }}>
      {data.insights.map((ins, i) => {
        const s = SEV[ins.severity] || SEV.info;
        return (
          <div key={i} style={{ flex: "1 1 280px", minWidth: 240, background: `${s.c}10`, border: `1px solid ${s.c}35`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8 }}>
            <span style={{ color: s.c, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{ins.title}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{ins.detail}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── rediseño: deltas, cobertura, outcomes, leaderboard por bot, captura ─────────

/** ▲▼ chip de variación vs periodo previo, coloreado por si el movimiento es bueno. */
function DeltaChip({ d, unit = "%" }: { d?: KpiDelta; unit?: string }) {
  if (!d || d.dir === "flat") return null;
  const col = d.good ? G : R;
  const Icon = d.dir === "up" ? TrendingUp : TrendingDown;
  const txt = Math.abs(d.pct) >= 0.1 ? `${d.pct > 0 ? "+" : ""}${d.pct}%` : `${d.abs > 0 ? "+" : ""}${d.abs}${unit}`;
  return (
    <span title="vs periodo previo" style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 800, color: col }}>
      <Icon size={11} /> {txt}
    </span>
  );
}

const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = muted }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 600, color, background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30`, borderRadius: 12, padding: "2px 9px", whiteSpace: "nowrap" }}>
    {children}
  </span>
);

/** Color por tasa donde ALTO es malo (fallback / agente). */
const rateColorHigh = (v: number) => (v >= 50 ? R : v >= 25 ? A : "rgba(255,255,255,0.72)");

// ── Cobertura / atribución (honestidad primero) ──
const CoverageWidget = ({ data }: WidgetCtx) => {
  const c: CoverageInfo = data.coverage;
  const attrPct = c.coveragePct;
  const unattrPct = c.total ? Math.round((c.unattributed / c.total) * 1000) / 10 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", justifyContent: "center" }}>
      <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        <div style={{ width: `${attrPct}%`, background: P }} />
        <div style={{ width: `${unattrPct}%`, background: "rgba(255,255,255,0.18)" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Tag color={P}><ShieldCheck size={11} /> {attrPct}% atribuidas a un bot</Tag>
        {c.unattributed > 0 && <Tag>{fmt(c.unattributed)} sin bot identificado</Tag>}
        {c.unnamedBots > 0 && <Tag color={A}>{c.unnamedBots} bots sin nombre</Tag>}
        {c.testBotsExcluded > 0 && <Tag>{c.testBotsExcluded} de prueba excluidos ({fmt(c.testSessionsExcluded)} conv)</Tag>}
        {!c.paidTrafficAvailable && <Tag>tráfico pagado 0% · sin ctwa_clid (brecha conocida)</Tag>}
      </div>
    </div>
  );
};

// ── "¿Qué pasó?" — distribución canónica de resultados (suma 100%) ──
const OutcomesWidget = ({ data }: WidgetCtx) => {
  const rows: OutcomeRow[] = data.outcomes;
  if (!rows.length) return <Empty />;
  const venta = rows.find((r) => r.key === "venta");
  return (
    <Col gap={10}>
      <div style={{ display: "flex", height: 26, borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.04)", flexShrink: 0 }}>
        {rows.map((r) => (
          <div key={r.key}
            title={`${r.label}: ${fmt(r.count)} (${r.pct}%)${r.rawLabels.length ? " ← " + r.rawLabels.map((x) => x.name).join(", ") : ""}`}
            style={{ width: `${r.pct}%`, background: CATEGORY_COLOR[r.category], minWidth: r.count ? 2 : 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", flexShrink: 0 }}>
        {rows.map((r) => (
          <span key={r.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: CATEGORY_COLOR[r.category] }} />
            <span style={{ color: "rgba(255,255,255,0.78)" }}>{r.label}</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{r.pct}%</span>
            <span style={{ color: muted }}>({fmt(r.count)})</span>
          </span>
        ))}
      </div>
      {venta && venta.rawLabels.length > 1 && (
        <div style={{ fontSize: 10.5, color: muted, flexShrink: 0 }}>
          {fmt(venta.count)} ventas reales — antes dispersas en {venta.rawLabels.length} etiquetas distintas ({venta.rawLabels.slice(0, 3).map((x) => x.name).join(", ")}…)
        </div>
      )}
    </Col>
  );
};

// ── Libro mayor POR BOT (el corte que el promedio ocultaba) ──
const HEALTH_COLOR: Record<BotPerf["health"], string> = { ok: G, warn: A, broken: R };
const HEALTH_LABEL: Record<BotPerf["health"], string> = { ok: "OK", warn: "Atención", broken: "Roto" };

function HealthChip({ h }: { h: BotPerf["health"] }) {
  const c = HEALTH_COLOR[h];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: c }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} /> {HEALTH_LABEL[h]}
    </span>
  );
}

const cell: React.CSSProperties = { padding: "6px 8px", textAlign: "right", whiteSpace: "nowrap", color: "rgba(255,255,255,0.82)" };

function BotRow({ b }: { b: BotPerf }) {
  const dim = !b.sufficient || b.isUnattributed;
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: b.health === "broken" && !b.isUnattributed ? "rgba(239,68,68,0.06)" : "transparent", opacity: dim ? 0.65 : 1 }}>
      <td style={{ padding: "6px 8px", textAlign: "left", maxWidth: 230 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span title={b.botName} style={{ color: b.isUnattributed ? muted : "rgba(255,255,255,0.92)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{b.botName}</span>
          {b.isUnnamed && <span style={{ fontSize: 9, fontFamily: "monospace", color: muted, background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: 4 }}>{b.botId.slice(0, 6)}</span>}
          {!b.sufficient && !b.isUnattributed && <span style={{ fontSize: 9, color: muted }}>n={b.sessions}</span>}
        </div>
      </td>
      <td style={cell}>
        {fmt(b.sessions)}{" "}
        {b.delta && b.delta.sessions !== 0 && <span style={{ fontSize: 10, color: b.delta.sessions > 0 ? G : muted }}>{b.delta.sessions > 0 ? "+" : ""}{b.delta.sessions}</span>}
      </td>
      <td style={{ ...cell, fontWeight: 700, color: b.sales > 0 ? G : muted }}>{fmt(b.sales)}</td>
      <td style={cell}>{b.conversionRate}%</td>
      <td style={{ ...cell, color: rateColorHigh(b.fallbackRate) }}>{b.fallbackRate}%</td>
      <td style={{ ...cell, color: rateColorHigh(b.agentRate) }}>{b.agentRate}%</td>
      <td style={{ ...cell, color: muted }}>{b.captureCompleteRate}%</td>
      <td style={cell}>{b.isUnattributed ? <span style={{ color: muted }}>—</span> : <HealthChip h={b.health} />}</td>
    </tr>
  );
}

const BotLeaderboardWidget = ({ data }: WidgetCtx) => {
  const all: BotPerf[] = data.botPerf;
  if (!all.length) return <Empty msg="Sin actividad por bot en el periodo" />;
  const prod = all.filter((b) => !b.isTest && !b.isUnattributed);
  const unattr = all.find((b) => b.isUnattributed);
  const test = all.filter((b) => b.isTest);
  const ordered = [...prod, ...(unattr ? [unattr] : [])];
  const HEADERS = ["Bot", "Sesiones", "Ventas", "Conv.", "Fallback", "Agente", "Captura", "Salud"];
  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {HEADERS.map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 8px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#070b14" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((b) => <BotRow key={b.botId} b={b} />)}
        </tbody>
      </table>
      {test.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10.5, color: muted }}>
          {test.length} bot(s) de prueba excluidos del agregado: {test.map((t) => t.botName).join(", ")}
        </div>
      )}
    </div>
  );
};

// ── Embudo de captura real (número → NIP → nombre → venta) + oportunidad ──
const CaptureFunnelWidget = ({ data }: WidgetCtx) => {
  const steps: CaptureFunnelStep[] = data.captureFunnel;
  if (!steps.length) return <Empty msg="Sin datos de captura" />;
  const opp: Opportunity = data.opportunity;
  const oppByLeak = new Map(opp.items.map((i) => [i.leak, i]));
  const maxDrop = Math.max(0, ...steps.slice(1).map((s) => s.dropOffPct));
  return (
    <Col gap={8}>
      <div style={{ fontSize: 10.5, color: muted, flexShrink: 0 }}>Orden BAIT · captura inferida del texto del bot (aprox.)</div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        {steps.map((s, i) => {
          const isBottleneck = i > 0 && s.dropOffPct > 0 && s.dropOffPct === maxDrop;
          const o = oppByLeak.get(`Se cae en "${s.label}"`);
          const isVenta = s.key === "venta";
          return (
            <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.82)", fontWeight: isVenta ? 700 : 500 }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: isVenta ? G : "rgba(255,255,255,0.85)" }}>{fmt(s.count)} <span style={{ color: muted, fontWeight: 400 }}>({s.pct}%)</span></span>
              </div>
              <div style={{ height: 16, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${s.pct}%`, height: "100%", background: isVenta ? G : P, opacity: 0.82, borderRadius: 5 }} />
              </div>
              {i > 0 && s.dropOff > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 10.5 }}>
                  <span style={{ color: isBottleneck ? R : muted, display: "flex", alignItems: "center", gap: 3 }}>
                    <TrendingDown size={11} /> −{fmt(s.dropOff)} ({s.dropOffPct}%){isBottleneck ? " · cuello de botella" : ""}
                  </span>
                  {o && <span style={{ color: A, fontWeight: 600, whiteSpace: "nowrap" }}>≈ +{o.extraSales} ventas</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {opp.totalExtraSales > 0 && (
        <div style={{ fontSize: 11.5, color: A, fontWeight: 600, flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
          <Lightbulb size={13} /> Potencial: +{opp.totalExtraSales} cambios recuperables
        </div>
      )}
    </Col>
  );
};

// ── Captura del NIP por IMAGEN + OCR (¿qué bots lo usan?) ──
const OcrNipWidget = ({ data }: WidgetCtx) => {
  const bots = data.botPerf.filter((b) => !b.isTest && !b.isUnattributed && b.sessions >= 10);
  if (!bots.length) return <Empty msg="Sin bots con muestra suficiente" />;
  const sorted = [...bots].sort((a, b) => Number(b.usesOcrNip) - Number(a.usesOcrNip) || b.ocrImageRate - a.ocrImageRate);
  const HEADERS = ["Bot", "Sesiones", "Imagen %", "Nodo OCR %", "NIP por imagen"];
  return (
    <Col gap={8}>
      <div style={{ fontSize: 10.5, color: muted, flexShrink: 0, lineHeight: 1.5 }}>
        El usuario manda foto del NIP → el form la guarda en <b style={{ color: "rgba(255,255,255,0.72)" }}>ocr_image_url</b> → el OCR valida NIP + vigencia + legibilidad.
        El OCR corre fuera de <code>/sessions</code>, así que se observan la <b style={{ color: "rgba(255,255,255,0.72)" }}>imagen del usuario</b> y los nodos de rama <b style={{ color: "rgba(255,255,255,0.72)" }}>«¿es Legible?»</b> (legibilidad) y <b style={{ color: "rgba(255,255,255,0.72)" }}>«Fecha Vigencia Nip»</b> (vigencia).
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {HEADERS.map((h, i) => (
                <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "5px 8px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#070b14" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.botId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: b.usesOcrNip ? "rgba(16,185,129,0.05)" : "transparent" }}>
                <td style={{ padding: "5px 8px", textAlign: "left", color: "rgba(255,255,255,0.88)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }} title={b.botName}>
                  {b.botName}{b.isUnnamed && <span style={{ fontSize: 9, fontFamily: "monospace", color: muted, marginLeft: 6 }}>{b.botId.slice(0, 6)}</span>}
                </td>
                <td style={cell}>{fmt(b.sessions)}</td>
                <td style={{ ...cell, color: b.ocrImageRate >= 10 ? G : "rgba(255,255,255,0.7)" }}>{b.ocrImageRate}%</td>
                <td style={{ ...cell, color: b.ocrFlowRate > 0 ? C : muted }}>{b.ocrFlowRate}%</td>
                <td style={cell}>{b.usesOcrNip ? <span style={{ color: G, fontWeight: 700 }}>● Sí</span> : <span style={{ color: muted }}>texto</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Col>
  );
};

// ── registry + default layout ───────────────────────────────────────────────────

export const WIDGETS: Record<string, WidgetDef> = {
  // Nivel 1 — honestidad + titulares
  coverage: { id: "coverage", title: "Cobertura y atribución", size: { w: 12, h: 2, minW: 6, minH: 2 }, render: (c) => <CoverageWidget {...c} /> },
  kpis: { id: "kpis", title: "Resumen de portabilidad", size: { w: 12, h: 3, minW: 4, minH: 2 }, render: (c) => <KpisWidget {...c} /> },
  // Nivel 2 — el corte accionable
  botPerf: { id: "botPerf", title: "Desempeño por bot · quién vende y quién está roto", size: { w: 12, h: 6, minW: 6, minH: 4 }, render: (c) => <BotLeaderboardWidget {...c} /> },
  insights: { id: "insights", title: "Dónde accionar · alertas y recomendaciones", size: { w: 12, h: 3, minW: 4, minH: 2 }, render: (c) => <InsightsWidget {...c} /> },
  outcomes: { id: "outcomes", title: "¿Qué pasó con las conversaciones?", size: { w: 6, h: 5, minW: 4, minH: 3 }, render: (c) => <OutcomesWidget {...c} /> },
  captureFunnel: { id: "captureFunnel", title: "Embudo de captura · número → NIP → nombre → venta", size: { w: 6, h: 5, minW: 4, minH: 4 }, render: (c) => <CaptureFunnelWidget {...c} /> },
  ocrNip: { id: "ocrNip", title: "Captura del NIP por imagen (OCR) · por bot", size: { w: 12, h: 4, minW: 5, minH: 3 }, render: (c) => <OcrNipWidget {...c} /> },
  // Nivel 3 — diagnóstico de detalle
  timeseries: { id: "timeseries", title: "Evolución de conversaciones", size: { w: 12, h: 4, minW: 4, minH: 3 }, render: (c) => <TimeseriesWidget {...c} /> },
  botflow: { id: "botflow", title: "Recorrido de portabilidad · dónde se caen los usuarios", size: { w: 12, h: 6, minW: 6, minH: 4 }, render: (c) => <BotFlowWidget {...c} /> },
  fallback: { id: "fallback", title: "Mensajes que el bot no entendió", size: { w: 6, h: 5, minW: 3, minH: 3 }, render: (c) => <FallbackWidget {...c} /> },
  buttons: { id: "buttons", title: "Botoneras · CTR de botones", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <ButtonsWidget {...c} /> },
  channelDistribution: { id: "channelDistribution", title: "Distribución por Canal", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <ChannelDistributionWidget {...c} /> },
  channels: { id: "channels", title: "Detalle Canal / Bot", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <ChannelsWidget {...c} /> },
  heatmap: { id: "heatmap", title: "Mapa de Calor por Demanda", size: { w: 12, h: 3, minW: 6, minH: 2 }, render: (c) => <HeatmapWidget {...c} /> },
  typifications: { id: "typifications", title: "Motivos de cierre (crudo)", size: { w: 3, h: 4, minW: 3, minH: 3 }, render: (c) => <TypificationsWidget {...c} /> },
  copies: { id: "copies", title: "Copys con baja conversión", size: { w: 3, h: 4, minW: 3, minH: 3 }, render: (c) => <CopiesWidget {...c} /> },
  bots: { id: "bots", title: "Sub-bots más activos", size: { w: 3, h: 4, minW: 2, minH: 3 }, render: (c) => <BotsWidget {...c} /> },
  errors: { id: "errors", title: "Errores de entrega", size: { w: 3, h: 4, minW: 2, minH: 3 }, render: (c) => <ErrorsWidget {...c} /> },
  flow: { id: "flow", title: "Flujo · transiciones más frecuentes", size: { w: 6, h: 4, minW: 4, minH: 3 }, render: (c) => <FlowWidget {...c} /> },
  // Extra (no en el layout por defecto, se agregan desde el editor)
  funnel: { id: "funnel", title: "Embudo de engagement (genérico)", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <FunnelWidget {...c} /> },
  botAgentSplit: { id: "botAgentSplit", title: "Carga Bot vs. Humano", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <BotVsAgentWidget {...c} /> },
  variables: { id: "variables", title: "Diccionario de variables personalizadas", size: { w: 12, h: 4, minW: 4, minH: 3 }, render: (c) => <VariablesWidget {...c} /> },
};

export interface LayoutCell { id: string; x: number; y: number; w: number; h: number }

// Narrativa de 3 niveles (de arriba abajo): (1) HONESTIDAD — cobertura/atribución
// y KPIs con tendencia, para que todo lo de abajo se lea con la confianza justa;
// (2) EL CORTE ACCIONABLE — desempeño por bot (lo que el promedio ocultaba),
// alertas, qué pasó con las conversaciones y el embudo de captura con su
// oportunidad; (3) DIAGNÓSTICO — tendencias, recorrido, canales, mapa de calor y
// detalle. El dato que decide la acción manda; la referencia granular baja.
export const DEFAULT_LAYOUT: LayoutCell[] = [
  // Nivel 1 — honestidad + titulares
  { id: "coverage", x: 0, y: 0, w: 12, h: 2 },
  { id: "kpis", x: 0, y: 2, w: 12, h: 3 },
  // Nivel 2 — el corte accionable
  { id: "botPerf", x: 0, y: 5, w: 12, h: 6 },
  { id: "insights", x: 0, y: 11, w: 12, h: 3 },
  { id: "outcomes", x: 0, y: 14, w: 6, h: 5 },
  { id: "captureFunnel", x: 6, y: 14, w: 6, h: 5 },
  { id: "ocrNip", x: 0, y: 19, w: 12, h: 4 },
  // Nivel 3 — diagnóstico de detalle
  { id: "timeseries", x: 0, y: 23, w: 12, h: 4 },
  { id: "botflow", x: 0, y: 27, w: 12, h: 6 },
  { id: "fallback", x: 0, y: 33, w: 6, h: 5 },
  { id: "buttons", x: 6, y: 33, w: 6, h: 5 },
  { id: "channelDistribution", x: 0, y: 38, w: 6, h: 4 },
  { id: "channels", x: 6, y: 38, w: 6, h: 4 },
  { id: "heatmap", x: 0, y: 42, w: 12, h: 3 },
  { id: "typifications", x: 0, y: 45, w: 3, h: 4 },
  { id: "copies", x: 3, y: 45, w: 3, h: 4 },
  { id: "bots", x: 6, y: 45, w: 3, h: 4 },
  { id: "errors", x: 9, y: 45, w: 3, h: 4 },
  { id: "flow", x: 0, y: 49, w: 6, h: 4 },
];
