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
  Bot, Users, MessageSquare, Zap, AlertTriangle, RefreshCw, Clock, Target,
  TrendingDown, Activity, ShieldAlert, Layers,
} from "lucide-react";
import type {
  DashboardData, Granularity, TimeBucket, BreakpointRow, ButtonRow, NamedCount,
} from "@/lib/botmaker/insights";

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

function Kpi({ label, value, sub, accent = P, icon }: { label: string; value: string | number; sub?: string; accent?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ flex: "1 1 130px", minWidth: 120, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}28`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ color: accent, opacity: 0.7, display: "flex" }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1.05 }}>{value}</span>
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
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      <Kpi label="Sesiones" value={fmt(k.sessions)} accent={P} icon={<Bot size={14} />} sub={`${fmt(k.users)} usuarios`} />
      <Kpi label="Mensajes" value={fmt(k.messages)} accent={C} icon={<MessageSquare size={14} />} sub={`${fmt(k.userMessages)} de usuarios`} />
      <Kpi label="Automatización" value={pctTxt(k.automationRate)} accent={G} icon={<Zap size={14} />} sub="sin agente" />
      <Kpi label="Escalación" value={pctTxt(k.agentRate)} accent={A} icon={<Users size={14} />} sub="llegan a agente" />
      <Kpi label="Fallback" value={pctTxt(k.fallbackRate)} accent={R} icon={<AlertTriangle size={14} />} sub="no entendió" />
      <Kpi label="Reintentos" value={pctTxt(k.retryRate)} accent={A} icon={<RefreshCw size={14} />} sub="sesiones c/ error de dato" />
      <Kpi label="1ª respuesta" value={secTxt(k.avgFirstResponseSec)} accent={C} icon={<Clock size={14} />} sub="promedio bot" />
      <Kpi label="Conversión" value={pctTxt(k.conversionRate)} accent={G} icon={<Target size={14} />} sub="tipificada venta" />
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

const HeatmapWidget = ({ data }: WidgetCtx) => {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const max = Math.max(1, ...data.heatmap.flat());
  if (max <= 1 && data.kpis.sessions === 0) return <Empty />;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 4, overflow: "auto" }}>
      <div style={{ display: "flex", gap: 3, paddingLeft: 30 }}>
        {Array.from({ length: 24 }).map((_, h) => (
          <span key={h} style={{ flex: 1, fontSize: 7.5, color: muted, textAlign: "center" }}>{h % 3 === 0 ? h : ""}</span>
        ))}
      </div>
      {data.heatmap.map((row, d) => (
        <div key={d} style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <span style={{ width: 27, fontSize: 9.5, color: muted, flexShrink: 0 }}>{days[d]}</span>
          {row.map((v, h) => {
            const t = v / max;
            return <div key={h} title={`${days[d]} ${h}:00 — ${v} sesiones`} style={{ flex: 1, aspectRatio: "1", borderRadius: 2, minWidth: 0, background: v === 0 ? "rgba(255,255,255,0.04)" : `rgba(168,85,247,${0.15 + t * 0.85})` }} />;
          })}
        </div>
      ))}
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

// ── registry + default layout ───────────────────────────────────────────────────

export const WIDGETS: Record<string, WidgetDef> = {
  kpis: { id: "kpis", title: "Resumen ejecutivo", size: { w: 12, h: 2, minW: 4, minH: 2 }, render: (c) => <KpisWidget {...c} /> },
  botAgentSplit: { id: "botAgentSplit", title: "Carga Bot vs. Humano", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <BotVsAgentWidget {...c} /> },
  channelDistribution: { id: "channelDistribution", title: "Distribución por Canal", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <ChannelDistributionWidget {...c} /> },
  insights: { id: "insights", title: "Insights automáticos", size: { w: 12, h: 2, minW: 4, minH: 2 }, render: (c) => <InsightsWidget {...c} /> },
  timeseries: { id: "timeseries", title: "Evolución Temporal", size: { w: 12, h: 4, minW: 4, minH: 3 }, render: (c) => <TimeseriesWidget {...c} /> },
  heatmap: { id: "heatmap", title: "Mapa de Calor por Demanda", size: { w: 12, h: 4, minW: 6, minH: 3 }, render: (c) => <HeatmapWidget {...c} /> },
  funnel: { id: "funnel", title: "Funnel conversacional", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <FunnelWidget {...c} /> },
  botflow: { id: "botflow", title: "Flow Explorer · Recorrido del Bot", size: { w: 12, h: 6, minW: 6, minH: 4 }, render: (c) => <BotFlowWidget {...c} /> },
  fallback: { id: "fallback", title: "Intenciones no entendidas (fallback)", size: { w: 6, h: 5, minW: 3, minH: 3 }, render: (c) => <FallbackWidget {...c} /> },
  buttons: { id: "buttons", title: "Botoneras · CTR de botones", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <ButtonsWidget {...c} /> },
  channels: { id: "channels", title: "Detalle Canal / Bot", size: { w: 6, h: 4, minW: 3, minH: 3 }, render: (c) => <ChannelsWidget {...c} /> },
  flow: { id: "flow", title: "Flujo · transiciones más frecuentes", size: { w: 6, h: 4, minW: 4, minH: 3 }, render: (c) => <FlowWidget {...c} /> },
  typifications: { id: "typifications", title: "Tipificaciones de cierre", size: { w: 3, h: 4, minW: 3, minH: 3 }, render: (c) => <TypificationsWidget {...c} /> },
  copies: { id: "copies", title: "Copys con baja conversión", size: { w: 3, h: 4, minW: 3, minH: 3 }, render: (c) => <CopiesWidget {...c} /> },
  bots: { id: "bots", title: "Sub-bots más activos", size: { w: 3, h: 4, minW: 2, minH: 3 }, render: (c) => <BotsWidget {...c} /> },
  errors: { id: "errors", title: "Errores de entrega", size: { w: 3, h: 4, minW: 2, minH: 3 }, render: (c) => <ErrorsWidget {...c} /> },
  variables: { id: "variables", title: "Diccionario de variables personalizadas", size: { w: 12, h: 4, minW: 4, minH: 3 }, render: (c) => <VariablesWidget {...c} /> },
};

export interface LayoutCell { id: string; x: number; y: number; w: number; h: number }

export const DEFAULT_LAYOUT: LayoutCell[] = [
  { id: "kpis", x: 0, y: 0, w: 12, h: 2 },
  { id: "botAgentSplit", x: 0, y: 2, w: 6, h: 4 },
  { id: "channelDistribution", x: 6, y: 2, w: 6, h: 4 },
  { id: "timeseries", x: 0, y: 6, w: 12, h: 4 },
  { id: "heatmap", x: 0, y: 10, w: 12, h: 4 },
  { id: "insights", x: 0, y: 14, w: 12, h: 2 },
  { id: "funnel", x: 0, y: 16, w: 6, h: 4 },
  { id: "typifications", x: 6, y: 16, w: 3, h: 4 },
  { id: "copies", x: 9, y: 16, w: 3, h: 4 },
  { id: "botflow", x: 0, y: 20, w: 12, h: 6 },
  { id: "fallback", x: 0, y: 26, w: 6, h: 5 },
  { id: "buttons", x: 6, y: 26, w: 6, h: 4 },
  { id: "channels", x: 0, y: 31, w: 6, h: 4 },
  { id: "flow", x: 6, y: 31, w: 6, h: 4 },
  { id: "bots", x: 0, y: 35, w: 3, h: 4 },
  { id: "errors", x: 3, y: 35, w: 3, h: 4 },
  { id: "variables", x: 0, y: 39, w: 12, h: 4 },
];
