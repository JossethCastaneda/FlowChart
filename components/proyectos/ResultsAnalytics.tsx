"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Users, Bot, UserCog, Clock, Timer, Tag, BarChart3, HelpCircle, Bug, Loader2, Plug, AlertTriangle } from "lucide-react";

interface Project { whatsapp?: string[]; instagram?: string[]; fanpage?: string[] }
interface Channel { id: string; name: string; platform: string; active: boolean }

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

export function ResultsAnalytics({ project }: { project: Project }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [channelId, setChannelId] = useState("");
  const [metrics, setMetrics] = useState<any>(null);
  const [dataSource, setDataSource] = useState<string>("");
  const [total, setTotal] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [botErrors, setBotErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load channels + auto-link to the project's WhatsApp/IG.
  useEffect(() => {
    fetch("/api/botmaker/channels")
      .then((r) => r.json())
      .then((d) => {
        setConnected(!!d.connected);
        const list: Channel[] = d.channels || [];
        setChannels(list);
        const wa = (project.whatsapp || []).map((w) => String(w).replace(/\D/g, ""));
        const match = list.find((c) => wa.some((w) => w && (c.id?.includes(w) || c.name?.includes(w))))
          || list.find((c) => c.platform === "whatsapp")
          || list[0];
        if (match) setChannelId(match.id);
      })
      .catch(() => setConnected(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = channelId ? `?channelId=${encodeURIComponent(channelId)}` : "";
    fetch(`/api/botmaker/analytics${q}`)
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d.metrics || null);
        setDataSource(d.dataSource || "");
        setTotal(d.totalSessionsAnalyzed || 0);
        setErrorMsg(d.dataSource === "error" ? (d.error || "Error al consultar BotMaker") : "");
        setBotErrors(d.botErrors || []);
        if (typeof d.connected === "boolean") setConnected(d.connected);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channelId]);

  const m = metrics || {};
  const maxHourly = useMemo(() => Math.max(1, ...((m.hourlyUniqueSessions as number[]) || [0])), [m]);

  if (loading && !metrics) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><Loader2 style={{ width: 24, height: 24, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Connection / status banner */}
      {connected === false ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <Plug style={{ width: 16, height: 16, color: "#fbbf24", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#fcd34d" }}>BotMaker no conectado. Configura el <strong>access-token</strong> de BotMaker (env <code>BOTMAKER_ACCESS_TOKEN</code> o Integraciones) para traer datos.</span>
        </div>
      ) : errorMsg ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#fca5a5" }}>{errorMsg}</span>
        </div>
      ) : dataSource === "sessions" ? (
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {total.toLocaleString("es-MX")} sesiones analizadas · últimos 30 días{channels.length ? ` · ${channels.length} canal(es)` : ""}
        </div>
      ) : null}

      {/* Channel selector */}
      {channels.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>Canal:</span>
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", outline: "none", cursor: "pointer" }}>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.platform})</option>)}
          </select>
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
