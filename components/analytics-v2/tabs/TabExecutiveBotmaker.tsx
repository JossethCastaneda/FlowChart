"use client";

import React, { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar, Cell, AreaChart, Area } from "recharts";
import { RefreshCw, Bot, GitBranch, MessageSquare, Zap, Target, Activity, Calendar } from "lucide-react";
import { useAnalyticsData } from "../useAnalyticsData";

const panel: React.CSSProperties = { background: "rgba(255,255,255,0.02)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 20 };
const h3: React.CSSProperties = { color: "var(--foreground)", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 };
const PALETTE = ["var(--cyan)", "var(--emerald)", "var(--amber)", "var(--purple)", "#f472b6", "#fb923c", "var(--cyan)", "var(--red)"];

function Mini({ label, value, color = "var(--foreground)" }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ color: "var(--text-muted)", fontSize: 10 }}>{label}</div>
      <div style={{ color, fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export function TabExecutiveBotmaker({ query, base }: { query: string; base: string }) {
  const { data, loading, error } = useAnalyticsData<any>(`${base}/bot-executive`, query);

  // Selector temporal para comparativa A/B si no se manda desde el filtro global
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  if (loading && !data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--cyan)" }} />
        <p style={{ fontSize: 14 }}>Analizando rendimiento ejecutivo del bot...</p>
      </div>
    );
  }

  if (error) return <div style={{ padding: 60, textAlign: "center", color: "var(--red)" }}>{error}</div>;
  if (!data) return <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Sin datos para este periodo.</div>;

  // Si no hay botId seleccionado en los filtros globales, obligar a seleccionar uno para esta vista.
  if (!data.botId || data.botId === "all") {
    return (
      <div style={{ ...panel, padding: 48, textAlign: "center" }}>
        <Bot className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Selecciona un Bot específico en los filtros superiores.</p>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>El Dashboard Ejecutivo requiere analizar un flujo específico a la vez.</p>
      </div>
    );
  }

  const { timeline = [], funnel = [], channels = [], patterns = {} } = data;

  return (
    <div className="space-y-6">
      
      {/* SECCIÓN 1: KPIs Ejecutivos Principales */}
      <div style={{ ...panel, borderColor: "rgba(0,212,255,0.25)" }}>
        <h3 style={h3}><Target className="w-4 h-4 text-cyan-400" /> Rendimiento Global: {data.botName}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
          <Mini label="Total Sesiones Iniciadas" value={data.totalSessions?.toLocaleString()} color="var(--cyan)" />
          <Mini label="Conversión Intelix (Ventas)" value={data.intelixSales?.toLocaleString()} color="var(--emerald)" />
          <Mini label="Tasa de Conversión Real" value={`${data.conversionRate?.toFixed(1) || 0}%`} color="var(--emerald)" />
          <Mini label="Tasa de Rechazo Intelix" value={`${data.rejectionRate?.toFixed(1) || 0}%`} color="var(--red)" />
          <Mini label="Eventos Zapier (CAPI)" value={data.zapierEvents?.toLocaleString() || 0} color="var(--purple)" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
        {/* SECCIÓN 2: Evolución Temporal (Día/Semana) y Comparativa */}
        <div style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <Activity className="w-4 h-4 text-cyan-400" /> Evolución y Comparativa (A/B)
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setViewMode("daily")} style={{ padding: "4px 8px", fontSize: 10, borderRadius: 4, background: viewMode === "daily" ? "var(--cyan)" : "transparent", color: viewMode === "daily" ? "#000" : "white", border: "1px solid var(--cyan)", cursor: "pointer" }}>Día a Día</button>
              <button onClick={() => setViewMode("weekly")} style={{ padding: "4px 8px", fontSize: 10, borderRadius: 4, background: viewMode === "weekly" ? "var(--cyan)" : "transparent", color: viewMode === "weekly" ? "#000" : "white", border: "1px solid var(--cyan)", cursor: "pointer" }}>Semana a Semana</button>
            </div>
          </div>
          
          <div style={{ height: 260 }}>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--emerald)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--emerald)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "var(--foreground)", borderColor: "var(--surface)", borderRadius: "8px", color: "var(--foreground)" }} />
                  <Area type="monotone" dataKey="sales" stroke="var(--emerald)" fillOpacity={1} fill="url(#colorSales)" name="Ventas Confirmadas" />
                  <Line type="monotone" dataKey="previousSales" stroke="var(--text-secondary)" strokeDasharray="4 4" dot={false} name="Periodo Anterior (Comparativa)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 100 }}>Sin datos en línea de tiempo.</div>}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Observa las caídas/subidas de conversión tras realizar cambios en el flujo del bot.</p>
        </div>

        {/* SECCIÓN 3: Funnel Transaccional Intelix & Zapier */}
        <div style={panel}>
          <h3 style={h3}><GitBranch className="w-4 h-4 text-cyan-400" /> Funnel Estricto: Captura → Intelix → Zapier</h3>
          {funnel.length > 0 ? (
            <div className="space-y-4">
              {funnel.map((s: any, i: number) => {
                const top = funnel[0]?.count || 1;
                const w = Math.round((s.count / top) * 100);
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 140, fontSize: 11, color: "var(--foreground)", textAlign: "right" }}>{s.label}</div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 26, position: "relative" }}>
                      <div style={{ width: `${w}%`, background: PALETTE[i % PALETTE.length], height: "100%", borderRadius: 6, transition: "width .3s" }} />
                      <span style={{ position: "absolute", left: 8, top: 5, fontSize: 11, color: "var(--foreground)" }}>{s.count.toLocaleString("es-MX")} ({w}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>Sin datos de funnel.</div>}
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 16, lineHeight: 1.5 }}>
            <span style={{ color: "var(--red)" }}>Rechazos Intelix detectados: {data.intelixRejections?.toLocaleString() || 0}</span><br />
            Mide la eficiencia end-to-end. Las caídas entre "Validación Intelix" y "Envío Zapier" pueden indicar fallos técnicos de webhook.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
        {/* SECCIÓN 4: Patrones de Mensajería y Tiempos */}
        <div style={panel}>
          <h3 style={h3}><MessageSquare className="w-4 h-4 text-cyan-400" /> Patrones y Tiempos de Respuesta</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <Mini label="Respuesta Prom. del Bot" value={`${patterns.avgBotResponseMs ? (patterns.avgBotResponseMs / 1000).toFixed(1) : 0}s`} />
            <Mini label="Respuesta Prom. del Usuario" value={`${patterns.avgUserResponseMs ? (patterns.avgUserResponseMs / 1000).toFixed(1) : 0}s`} color="var(--purple)" />
            <Mini label="Interacciones Prom." value={patterns.avgInteractions?.toFixed(1) || 0} />
          </div>
          <div style={{ color: "var(--foreground)", fontSize: 12 }}>
            <strong>Organización de Solicitud de Datos:</strong>
            <ul style={{ paddingLeft: 16, marginTop: 8, color: "var(--text-secondary)" }}>
              <li>Tiempo para solicitar NIP: {patterns.timeToNip || "N/A"}</li>
              <li>Tiempo para pedir Número a Cambiar: {patterns.timeToPhone || "N/A"}</li>
            </ul>
          </div>
        </div>

        {/* SECCIÓN 5: Tráfico por Canales */}
        <div style={panel}>
          <h3 style={h3}><Zap className="w-4 h-4 text-cyan-400" /> Recepción por Canal</h3>
          {channels.length > 0 ? (
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channels} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="channel" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <RechartsTooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ backgroundColor: "var(--foreground)", borderColor: "var(--surface)", borderRadius: "8px", fontSize: "12px", color: "var(--foreground)" }} />
                  <Bar dataKey="count" name="Sesiones" radius={[0, 4, 4, 0]} barSize={20}>
                    {channels.map((_: any, i: number) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>Sin datos de canales.</div>}
        </div>
      </div>

    </div>
  );
}
