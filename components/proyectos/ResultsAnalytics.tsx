"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare, Users, Bot, UserCog, Clock, Timer, Tag, BarChart3, HelpCircle, Bug,
  Loader2, Plug, AlertTriangle, MessageCircle, Camera, ThumbsUp, Layers,
  Target, Cpu, TrendingUp, Zap, CheckCircle2, XCircle, Info,
  Activity, ArrowRight, Crosshair,
} from "lucide-react";

type TabKey = "all" | "whatsapp" | "messenger" | "instagram" | "facebook";

// Order matters: "Todos" first, then the 4 product channels the user selects.
const TABS: { key: TabKey; label: string; icon: any; color: string }[] = [
  { key: "all", label: "Todos", icon: Layers, color: "#00d4ff" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#25d366" },
  { key: "messenger", label: "Messenger", icon: MessageSquare, color: "#0084ff" },
  { key: "instagram", label: "Instagram", icon: Camera, color: "#e1306c" },
  { key: "facebook", label: "Facebook", icon: ThumbsUp, color: "#1877f2" },
];

const DAYS_HOURS = Array.from({ length: 24 }, (_, i) => i);

function fmtDuration(sec: number): string {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60); const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
const n = (v: number) => (v ? v.toLocaleString("es-MX") : "—");

interface SourceSegment {
  source: string;
  label: string;
  integrationId: string;
  connected: boolean;
  error?: string;
  data: any;
}

// Identidad visual de cada herramienta CRM conectada al proyecto.
const SOURCE_META: Record<string, { color: string; icon: any }> = {
  botmaker: { color: "#3b82f6", icon: Bot },
  cari: { color: "#10b981", icon: Cpu },
};

/**
 * Análisis de resultados del proyecto.
 *
 * Si el proyecto tiene CRMs conectados (crmIntegrationIds), consulta
 * /api/projects/[id]/results y muestra UN segmento independiente por
 * herramienta (ej. Botmaker | Cari AI) — el tráfico de cada una nunca se
 * mezcla. Sin CRMs configurados cae al comportamiento anterior
 * (analítica Botmaker del workspace).
 */
export function ResultsAnalytics({ project }: { project?: { id?: string; whatsapp?: string[]; instagram?: string[]; fanpage?: string[]; crmIntegrationIds?: string[]; crmIntegrationId?: string | null } }) {
  const hasCrms = !!project?.id && ((project?.crmIntegrationIds?.length || 0) > 0 || !!project?.crmIntegrationId);
  const [segments, setSegments] = useState<SourceSegment[] | null>(null);
  const [activeSource, setActiveSource] = useState(0);
  const [segLoading, setSegLoading] = useState(hasCrms);

  useEffect(() => {
    if (!hasCrms) { setSegments(null); setSegLoading(false); return; }
    let alive = true;
    setSegLoading(true);
    fetch(`/api/projects/${project!.id}/results?days=30`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        const src: SourceSegment[] = res?.data?.sources || [];
        setSegments(src.length > 0 ? src : null);
        setActiveSource(0);
      })
      .catch(() => { if (alive) setSegments(null); })
      .finally(() => { if (alive) setSegLoading(false); });
    return () => { alive = false; };
  }, [hasCrms, project?.id]);

  if (segLoading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;
  }

  // Sin CRMs por proyecto → comportamiento legado (Botmaker del workspace).
  if (!segments) return <BotmakerResultsView />;

  const seg = segments[Math.min(activeSource, segments.length - 1)];

  return (
    <div className="space-y-4">
      {/* Selector de fuente — cada herramienta se analiza por separado */}
      {segments.length > 1 && (
        <div role="tablist" aria-label="Fuentes CRM" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {segments.map((s, i) => {
            const meta = SOURCE_META[s.source] || { color: "#64748b", icon: Layers };
            const Icon = meta.icon;
            const active = i === activeSource;
            return (
              <button key={s.integrationId} role="tab" aria-selected={active} onClick={() => setActiveSource(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                  color: active ? meta.color : "#94a3b8",
                  background: active ? `${meta.color}14` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? `${meta.color}55` : "rgba(255,255,255,0.08)"}`,
                }}>
                <Icon style={{ width: 15, height: 15 }} />
                {s.label}
                {!s.connected && <span style={{ fontSize: 9, color: "#fbbf24" }}>· sin conectar</span>}
              </button>
            );
          })}
        </div>
      )}

      {seg.error && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#fca5a5" }}>{seg.error}</span>
        </div>
      )}

      {seg.source === "cari"
        ? <CariResultsView data={seg.data} />
        : seg.source === "botmaker"
          ? <BotmakerResultsView initialData={seg.data} />
          : <Empty label={`La fuente ${seg.label} aún no tiene adaptador de resultados.`} />}
    </div>
  );
}

function BotmakerResultsView({ initialData }: { initialData?: any }) {
  const [data, setData] = useState<any>(initialData ?? null);
  const [connected, setConnected] = useState<boolean | null>(initialData ? (initialData.connected ?? true) : null);
  const [tab, setTab] = useState<TabKey>("all");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [loading, setLoading] = useState(!initialData);

  // Modo legado (sin CRMs por proyecto): fetch propio al endpoint de workspace.
  useEffect(() => {
    if (initialData) return;
    let alive = true;
    setLoading(true);
    fetch("/api/botmaker/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setData(d);
        setConnected(typeof d.connected === "boolean" ? d.connected : true);
        setErrorMsg(d.dataSource === "error" ? (d.error || "Error al consultar BotMaker") : "");
      })
      .catch((err) => {
        if (!alive) return;
        console.error("[ResultsAnalytics] fetch error:", err);
        setErrorMsg("Error de red al consultar analíticas");
        setConnected(false);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [initialData]);

  const counts = (data?.counts || {}) as Record<TabKey, number>;
  const m = (tab === "all" ? data?.all : data?.byChannel?.[tab]) || {};
  const total = counts[tab] || 0;
  const botErrors: any[] = data?.botErrors || [];
  const channels: any[] = data?.channels || [];
  // Quality + diagnostic follow the active channel tab: "Todos" → aggregate,
  // a specific channel → that channel's own lead/bot quality.
  const activeQuality = tab === "all" ? null : data?.qualityByChannel?.[tab];
  const leadQ = (tab === "all" ? data?.leadQuality : activeQuality?.leadQuality) || null;
  const botQ = (tab === "all" ? data?.botQuality : activeQuality?.botQuality) || null;
  const diag = (tab === "all" ? data?.diagnostic : activeQuality?.diagnostic) || null;
  const tabLabel = TABS.find((t) => t.key === tab)?.label || "";
  const maxHourly = useMemo(() => Math.max(1, ...((m.hourlyUniqueSessions as number[]) || [0])), [m]);

  if (loading && !data) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Connection / status banner */}
      {connected === false ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <Plug style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#fcd34d" }}>BotMaker no conectado. Conéctalo en <strong>Integraciones</strong> para ver el análisis por canal.</span>
        </div>
      ) : errorMsg ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#fca5a5" }}>{errorMsg}</span>
        </div>
      ) : data?.dataSource === "sessions" ? (
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {total.toLocaleString("es-MX")} sesiones · últimos 30 días{channels.length ? ` · ${channels.length} canal(es) conectados` : ""}
        </div>
      ) : null}

      {/* Channel tabs — WhatsApp · Messenger · Instagram · Facebook (+ Todos) */}
      <div role="tablist" aria-label="Canales" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const c = counts[t.key] || 0;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                color: active ? t.color : "#94a3b8",
                background: active ? `${t.color}1a` : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? `${t.color}66` : "rgba(255,255,255,0.08)"}`,
                transition: "all .15s ease",
              }}
            >
              <Icon style={{ width: 14, height: 14, color: active ? t.color : "#64748b" }} />
              {t.label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                color: active ? t.color : "#64748b",
                background: active ? `${t.color}26` : "rgba(255,255,255,0.05)",
              }}>{c.toLocaleString("es-MX")}</span>
            </button>
          );
        })}
      </div>

      {/* Per-channel empty hint */}
      {connected !== false && !errorMsg && tab !== "all" && total === 0 && (
        <div style={{ fontSize: 12, color: "#64748b", padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          Sin sesiones en {TABS.find((t) => t.key === tab)?.label} para el periodo.
        </div>
      )}

      {/* Sessions + messages */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Metric icon={MessageSquare} color="#00d4ff" label="Sesiones iniciadas" value={n(m.sessionsStarted)} />
        <Metric icon={Users} color="#06d6a0" label="Sesiones únicas" value={n(m.uniqueSessions)} />
        <Metric icon={MessageSquare} color="#f472b6" label="Mensajes (usuario)" value={n(m.messagesByUser)} />
        <Metric icon={Bot} color="#7b61ff" label="Mensajes (bot)" value={n(m.messagesByBot)} />
        <Metric icon={UserCog} color="#fbbf24" label="Mensajes (agente)" value={n(m.messagesByAgent)} />
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric icon={Clock} color="#00d4ff" label="Tiempo prom. de respuesta" value={fmtDuration(m.avgResponseTimeSec)} />
        <Metric icon={Timer} color="#06d6a0" label="Inicio → cierre (prom.)" value={fmtDuration(m.avgSessionDurationSec)} />
        <Metric icon={Bot} color="#7b61ff" label="Respuesta del bot (prom.)" value={fmtDuration(m.avgBotResponseTimeSec)} />
        <Metric icon={Users} color="#f472b6" label="Respuesta del usuario (prom.)" value={fmtDuration(m.avgUserResponseTimeSec)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Typifications */}
        <Panel title="Tipificaciones más usadas" icon={Tag}>
          <ListOrEmpty items={(m.topTypifications || []).map((t: any) => ({ label: t.label, count: t.count }))} max={(m.topTypifications?.[0]?.count) || 1} color="#06d6a0" />
        </Panel>

        {/* Hourly unique sessions */}
        <Panel title="Franjas horarias (sesiones únicas)" icon={BarChart3}>
          {((m.hourlyUniqueSessions as number[]) || []).some((v) => v > 0) ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, paddingTop: 8 }}>
              {DAYS_HOURS.map((h) => {
                const v = (m.hourlyUniqueSessions || [])[h] || 0;
                return (
                  <div key={h} title={`${h}:00 — ${v}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ height: `${(v / maxHourly) * 100}%`, minHeight: v > 0 ? 3 : 0, background: "linear-gradient(180deg, #00d4ff, rgba(0,212,255,0.25))", borderRadius: "2px 2px 0 0" }} />
                    {h % 6 === 0 && <span style={{ fontSize: 7, color: "#475569", textAlign: "center", marginTop: 2 }}>{h}h</span>}
                  </div>
                );
              })}
            </div>
          ) : <Empty />}
        </Panel>

        {/* FAQs */}
        <Panel title="Preguntas frecuentes del usuario" icon={HelpCircle}>
          <ListOrEmpty items={(m.topUserQuestions || []).map((q: any) => ({ label: q.text, count: q.count }))} max={(m.topUserQuestions?.[0]?.count) || 1} color="#f472b6" />
        </Panel>

        {/* Bot bugs */}
        <Panel title="Bugs del bot" icon={Bug}>
          {botErrors.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {botErrors.slice(0, 8).map((b: any, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#fca5a5", padding: "6px 8px", borderRadius: 4, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>{b.message || b.error || JSON.stringify(b)}</div>
              ))}
            </div>
          ) : <Empty label="Sin errores reportados" />}
        </Panel>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE DIAGNOSTIC (CDO "So What?" Layer)                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {diag && diag.funnel?.[0]?.count > 0 && (
        <>
          {/* Headline + Quadrant Badge */}
          <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="section-header">
              <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity style={{ width: 14, height: 14, color: "#00d4ff" }} /> Diagnóstico Ejecutivo
              </span>
              <QuadrantBadge quadrant={diag.quadrant} label={diag.quadrantLabel} />
            </div>
            <div style={{ padding: "16px 20px" }}>
              {/* Declarative headline */}
              <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.5, marginBottom: 10 }}>
                {diag.headline}
              </p>
              <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
                {diag.quadrantDiagnosis}
              </p>

              {/* Prescriptive actions */}
              {diag.actions?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Acciones priorizadas</span>
                  {diag.actions.map((a: any) => {
                    const areaColors: Record<string, string> = { lead: "#06d6a0", bot: "#7b61ff", ops: "#fbbf24" };
                    const areaLabels: Record<string, string> = { lead: "LEAD", bot: "BOT", ops: "OPS" };
                    const ac = areaColors[a.area] || "#64748b";
                    return (
                      <div key={a.priority} style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        padding: "10px 14px", borderRadius: 6,
                        background: `${ac}08`, border: `1px solid ${ac}22`,
                      }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                          color: ac, background: `${ac}1a`, border: `1px solid ${ac}44`,
                          flexShrink: 0, marginTop: 1,
                        }}>{areaLabels[a.area] || a.area}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.4 }}>{a.action}</p>
                          <p style={{ fontSize: 10, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>{a.impact}</p>
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: `${ac}66`, flexShrink: 0, fontFamily: "'Orbitron',sans-serif" }}>
                          #{a.priority}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="glass-panel" style={{ padding: 0 }}>
            <div className="section-header">
              <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Crosshair style={{ width: 14, height: 14, color: "#f472b6" }} /> Funnel de Conversión Conversacional
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: diag.overallConversion >= 50 ? "#06d6a0" : diag.overallConversion >= 25 ? "#fbbf24" : "#ef4444" }}>
                {diag.overallConversion}% conversión total
              </span>
            </div>
            <div style={{ padding: "20px 20px 16px" }}>
              <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
                {diag.funnel.map((stage: any, i: number) => {
                  const isFirst = i === 0;
                  const maxCount = diag.funnel[0].count || 1;
                  const widthPct = (stage.count / maxCount) * 100;
                  const barColor = isFirst ? "#00d4ff" : stage.rate >= 70 ? "#06d6a0" : stage.rate >= 40 ? "#fbbf24" : "#ef4444";
                  return (
                    <div key={stage.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {/* Count */}
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, color: barColor }}>
                        {stage.count.toLocaleString("es-MX")}
                      </span>
                      {/* Label */}
                      <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textAlign: "center", marginBottom: 6, lineHeight: 1.3 }}>
                        {stage.label}
                      </span>
                      {/* Bar */}
                      <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          width: `${widthPct}%`, height: "100%", background: barColor,
                          borderRadius: 4, transition: "width 0.6s ease",
                        }} />
                      </div>
                      {/* Rate badge */}
                      {!isFirst && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: barColor, marginTop: 4 }}>
                          {stage.rate}%
                        </span>
                      )}
                      {/* Arrow between stages */}
                      {i < diag.funnel.length - 1 && (
                        <ArrowRight style={{
                          position: "absolute", right: -8, top: 6,
                          width: 14, height: 14, color: "#334155", zIndex: 1,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottleneck callout */}
              {diag.bottleneck?.stage && (
                <div style={{
                  marginTop: 14, padding: "8px 12px", borderRadius: 6,
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <AlertTriangle style={{ width: 12, height: 12, color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#fca5a5" }}>Cuello de botella: {diag.bottleneck.stage}</span>
                    <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>{diag.bottleneck.insight}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUALITY SCORING SECTION                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {(leadQ || botQ) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ marginTop: 8 }}>
          {/* Lead Quality */}
          {leadQ && <QualityPanel title={`Calidad de Lead${tab !== "all" ? ` · ${tabLabel}` : ""}`} icon={Target} data={leadQ} accentColor="#06d6a0" />}
          {/* Bot Quality */}
          {botQ && <QualityPanel title={`Calidad del Bot${tab !== "all" ? ` · ${tabLabel}` : ""}`} icon={Cpu} data={botQ} accentColor="#7b61ff" />}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, color, label, value }: { icon: any; color: string; label: string; value: string }) {
  return (
    <div className="glass-panel" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Icon style={{ width: 14, height: 14, color }} />
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-panel" style={{ padding: 0 }}>
      <div className="section-header">
        <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon style={{ width: 14, height: 14 }} /> {title}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function ListOrEmpty({ items, max, color }: { items: { label: string; count: number }[]; max: number; color: string }) {
  if (!items.length) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#cbd5e1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
          <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(it.count / max) * 100}%`, height: "100%", background: color, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color, width: 28, textAlign: "right" }}>{it.count}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ label = "Sin datos para el periodo" }: { label?: string }) {
  return <p style={{ fontSize: 12, color: "#475569", textAlign: "center", padding: "16px 0" }}>{label}</p>;
}

// ── Quality Panel with Radial Gauge ──────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  excellent: "#06d6a0",
  good: "#00d4ff",
  fair: "#fbbf24",
  poor: "#ef4444",
};
const LEVEL_LABELS: Record<string, string> = {
  excellent: "Excelente",
  good: "Bueno",
  fair: "Regular",
  poor: "Deficiente",
};

function QualityPanel({ title, icon: Icon, data, accentColor }: {
  title: string;
  icon: any;
  data: { score: number; level: string; subMetrics: any[]; summary: string; recommendation: string };
  accentColor: string;
}) {
  const levelColor = LEVEL_COLORS[data.level] || "#64748b";
  const levelLabel = LEVEL_LABELS[data.level] || data.level;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
      <div className="section-header">
        <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 14, height: 14, color: accentColor }} /> {title}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
          color: levelColor, background: `${levelColor}1a`, border: `1px solid ${levelColor}44`,
        }}>{levelLabel}</span>
      </div>

      <div style={{ padding: "20px 20px 16px", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Radial Gauge */}
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={levelColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 800, color: levelColor, lineHeight: 1 }}>
              {data.score}
            </span>
            <span style={{ fontSize: 8, color: "#64748b", fontWeight: 600, marginTop: 2 }}>/100</span>
          </div>
        </div>

        {/* Sub-metrics */}
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 10 }}>
          {data.subMetrics.map((sm: any) => {
            const pct = sm.max > 0 ? (sm.score / sm.max) * 100 : 0;
            const barColor = pct >= 70 ? "#06d6a0" : pct >= 40 ? "#fbbf24" : "#ef4444";
            return (
              <div key={sm.key}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{sm.label}</span>
                  <span style={{ fontSize: 10, color: barColor, fontWeight: 700 }}>
                    {sm.raw}{sm.unit !== "ratio" ? sm.unit : "x"}
                    <span style={{ color: "#475569", fontWeight: 400 }}> · {sm.score}/{sm.max}</span>
                  </span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", background: barColor,
                    borderRadius: 2, transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary + Recommendation */}
      <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Info style={{ width: 13, height: 13, color: "#64748b", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{data.summary}</span>
        </div>
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-start",
          padding: "8px 12px", borderRadius: 6,
          background: `${levelColor}08`, border: `1px solid ${levelColor}22`,
        }}>
          <TrendingUp style={{ width: 13, height: 13, color: levelColor, flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, color: levelColor, lineHeight: 1.5, fontWeight: 500 }}>{data.recommendation}</span>
        </div>
      </div>

      {/* Sub-metric tips (expandable insights) */}
      <div style={{ padding: "0 20px 16px" }}>
        <details style={{ cursor: "pointer" }}>
          <summary style={{ fontSize: 10, color: "#64748b", fontWeight: 600, padding: "4px 0", userSelect: "none" }}>
            Ver insights detallados
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {data.subMetrics.map((sm: any) => {
              const pct = sm.max > 0 ? (sm.score / sm.max) * 100 : 0;
              const StatusIcon = pct >= 70 ? CheckCircle2 : pct >= 40 ? Zap : XCircle;
              const statusColor = pct >= 70 ? "#06d6a0" : pct >= 40 ? "#fbbf24" : "#ef4444";
              return (
                <div key={sm.key} style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  padding: "6px 10px", borderRadius: 4,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <StatusIcon style={{ width: 12, height: 12, color: statusColor, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#cbd5e1" }}>{sm.label}:</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>{sm.tip}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CARI AI — vista de resultados (misma metodología: funnel del cliente,
// razones de no-finalización, errores del bot y tendencias). Datos en CDMX.
// ═════════════════════════════════════════════════════════════════════════════

function CariResultsView({ data }: { data: any }) {
  const kpis = data?.kpis || {};
  const funnel: any[] = data?.funnel || [];
  const reasons: any[] = data?.dropOffReasons || [];
  const botErr = data?.botErrors || { unanswered: [], totalUnanswered: 0, systemErrors: 0 };
  const daily: any[] = data?.daily || [];
  const insights: string[] = data?.insights || [];

  if (!data?.connected) {
    return (
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
        <Plug style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "#fcd34d" }}>Cari AI no conectado. Conéctalo en <strong>Integraciones</strong> con sus credenciales de reportes.</span>
      </div>
    );
  }

  const maxDaily = Math.max(1, ...daily.map((d) => d.total || 0));
  const maxReason = reasons[0]?.count || 1;

  return (
    <div className="space-y-4">
      {/* Rango + zona horaria + parcialidad */}
      <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span>{data.range?.from?.slice(0, 10)} → {data.range?.to?.slice(0, 10)} · hora CDMX</span>
        {data.partial && (
          <span style={{ color: "#fbbf24", display: "flex", gap: 4, alignItems: "center" }}>
            <AlertTriangle style={{ width: 11, height: 11 }} /> faltan credenciales de algún grupo de reportes — vista parcial
          </span>
        )}
      </div>

      {/* Headline narrativo */}
      <div className="glass-panel" style={{ padding: "16px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.5 }}>{data.headline}</p>
        {insights.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {insights.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <TrendingUp style={{ width: 12, height: 12, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric icon={MessageSquare} color="#00d4ff" label="Conversaciones" value={n(kpis.totalConversations)} />
        <Metric icon={Bot} color="#10b981" label="Contención del bot" value={kpis.totalConversations ? `${kpis.botContainmentPct}%` : "—"} />
        <Metric icon={UserCog} color="#fbbf24" label="Atendidas por agente" value={n(kpis.agentAttended)} />
        <Metric icon={XCircle} color="#ef4444" label="No finalizadas" value={kpis.totalConversations ? `${kpis.abandonedPct}%` : "—"} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Metric icon={CheckCircle2} color="#06d6a0" label="Tasa de finalización" value={kpis.totalConversations ? `${kpis.completionPct}%` : "—"} />
        <Metric icon={ArrowRight} color="#7b61ff" label="Transferidas a agente" value={n(kpis.transferred)} />
        <Metric icon={MessageSquare} color="#f472b6" label="Interacciones prom." value={kpis.avgInteractions ? String(kpis.avgInteractions) : "—"} />
      </div>

      {/* Funnel del cliente */}
      {funnel.length > 0 && funnel[0].count > 0 && (
        <div className="glass-panel" style={{ padding: 0 }}>
          <div className="section-header">
            <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Crosshair style={{ width: 14, height: 14, color: "#f472b6" }} /> Flujo del cliente
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: kpis.completionPct >= 70 ? "#06d6a0" : kpis.completionPct >= 40 ? "#fbbf24" : "#ef4444" }}>
              {kpis.completionPct}% finaliza
            </span>
          </div>
          <div style={{ padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
              {funnel.map((stage, i) => {
                const isFirst = i === 0;
                const maxCount = funnel[0].count || 1;
                const widthPct = (stage.count / maxCount) * 100;
                const barColor = isFirst ? "#00d4ff" : stage.rate >= 70 ? "#06d6a0" : stage.rate >= 40 ? "#fbbf24" : "#ef4444";
                return (
                  <div key={stage.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, color: barColor }}>{stage.count.toLocaleString("es-MX")}</span>
                    <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textAlign: "center", marginBottom: 6, lineHeight: 1.3 }}>{stage.label}</span>
                    <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${widthPct}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width 0.6s ease" }} />
                    </div>
                    {!isFirst && <span style={{ fontSize: 9, fontWeight: 700, color: barColor, marginTop: 4 }}>{stage.rate}%</span>}
                    {i < funnel.length - 1 && <ArrowRight style={{ position: "absolute", right: -8, top: 6, width: 14, height: 14, color: "#334155", zIndex: 1 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Razones de no-finalización */}
        <Panel title="Por qué no finalizan" icon={XCircle}>
          {reasons.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reasons.map((r) => (
                <div key={r.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600 }}>{r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>{r.count.toLocaleString("es-MX")} · {r.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
                    <div style={{ width: `${(r.count / maxReason) * 100}%`, height: "100%", background: "linear-gradient(90deg,#ef4444,#f87171)", borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>{r.insight}</p>
                </div>
              ))}
            </div>
          ) : <Empty label="Sin fugas registradas en el periodo" />}
        </Panel>

        {/* Errores del bot */}
        <Panel title={`Errores del bot · ${n(botErr.totalUnanswered)} frases sin respuesta`} icon={Bug}>
          {botErr.unanswered?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {botErr.unanswered.map((u: any, i: number) => (
                <div key={i} style={{ padding: "7px 10px", borderRadius: 4, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#fca5a5", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{u.phrase}"</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>{u.count}×</span>
                  </div>
                  <span style={{ fontSize: 9, color: "#64748b" }}>Flujo: {u.flow} · Nodo: {u.node}</span>
                </div>
              ))}
              {botErr.systemErrors > 0 && (
                <p style={{ fontSize: 10, color: "#fbbf24", marginTop: 4 }}>+ {n(botErr.systemErrors)} errores de sistema en el periodo</p>
              )}
            </div>
          ) : <Empty label={botErr.systemErrors > 0 ? `${n(botErr.systemErrors)} errores de sistema (sin frases pendientes)` : "El bot entendió todo en el periodo 🎉"} />}
        </Panel>
      </div>

      {/* Tendencia diaria */}
      <Panel title="Tendencia diaria (conversaciones · hora CDMX)" icon={BarChart3}>
        {daily.some((d) => d.total > 0) ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 130, paddingTop: 8 }}>
            {daily.map((d) => {
              const hTotal = (d.total / maxDaily) * 100;
              const hHandled = d.total > 0 ? ((d.bot + d.attended) / maxDaily) * 100 : 0;
              return (
                <div key={d.day} title={`${d.day}\nTotal: ${d.total}\nAtendidas: ${d.bot + d.attended}\nNo finalizadas: ${d.abandoned}`}
                  style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                  <div style={{ height: `${hTotal}%`, minHeight: d.total > 0 ? 3 : 0, background: "rgba(239,68,68,0.45)", borderRadius: "2px 2px 0 0", position: "relative" }}>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: hTotal > 0 ? `${(hHandled / hTotal) * 100}%` : 0, background: "linear-gradient(180deg,#10b981,rgba(16,185,129,0.5))", borderRadius: "2px 2px 0 0" }} />
                  </div>
                  {daily.length <= 31 && new Date(d.day + "T12:00:00").getDate() % 7 === 1 && (
                    <span style={{ fontSize: 7, color: "#475569", textAlign: "center", marginTop: 2 }}>{d.day.slice(5)}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : <Empty />}
        <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
          <span style={{ fontSize: 9, color: "#94a3b8", display: "flex", gap: 5, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981", display: "inline-block" }} /> Atendidas (bot + agente)</span>
          <span style={{ fontSize: 9, color: "#94a3b8", display: "flex", gap: 5, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(239,68,68,0.45)", display: "inline-block" }} /> No finalizadas</span>
        </div>
      </Panel>
    </div>
  );
}

function QuadrantBadge({ quadrant, label }: { quadrant: string; label: string }) {
  const colors: Record<string, string> = {
    "high-lead-high-bot": "#06d6a0",
    "high-lead-low-bot": "#ef4444",
    "low-lead-high-bot": "#fbbf24",
    "low-lead-low-bot": "#ef4444",
  };
  const c = colors[quadrant] || "#64748b";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
      color: c, background: `${c}1a`, border: `1px solid ${c}44`,
    }}>{label}</span>
  );
}
