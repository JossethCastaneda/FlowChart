"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Bot, User, Clock, HeartHandshake, TrendingUp, TrendingDown, RefreshCw, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

export function ConversationalDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(28);
  const [platform, setPlatform] = useState("all");

  useEffect(() => {
    fetchData();
  }, [days, platform]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/overview?days=${days}&platform=${platform}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Error al cargar datos");
      }
    } catch (e) {
      setError("Error de conexión al obtener los datos");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const kpis = data?.kpis || {};
  const trends = data?.charts?.trends || [];
  const topChannels = data?.charts?.topChannels || [];
  const recentConversations = data?.table?.recentConversations || [];
  
  const isEmpty = !loading && !error && data && kpis.totalConversations === 0;

  const KpiCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{ background: `${color}1A`, padding: "12px", borderRadius: "12px", color }}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 600, margin: "0 0 4px" }}>{title}</p>
        <h4 style={{ color: "white", fontSize: "24px", fontWeight: 700, margin: 0 }}>{value}</h4>
        {sub && <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginTop: "4px" }}>{sub}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
          <option value={7}>Últimos 7 días</option>
          <option value={14}>Últimos 14 días</option>
          <option value={28}>Últimos 28 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>

        <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}>
          <option value="all">Todas las plataformas</option>
          <option value="cari_ai">Cari AI</option>
          <option value="botmaker">Botmaker</option>
        </select>

        <button onClick={fetchData} disabled={loading} style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "8px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 500 }}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>

        <a href="/dashboard/analisis-resultados/configuracion" style={{ background: "var(--cyan)", border: "none", color: "#0f172a", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
          Configuración
        </a>
      </div>

      {loading && !data ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#64748b", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#3b82f6" }} />
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: 600 }}>Cargando métricas...</h3>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>Extrayendo resultados de los bots y agentes.</p>
        </div>
      ) : error ? (
        <div style={{ padding: "60px", textAlign: "center", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <h3 style={{ color: "#f87171", fontSize: "16px", fontWeight: 600 }}>{error}</h3>
          <button onClick={fetchData} style={{ marginTop: "16px", background: "#ef4444", color: "white", padding: "8px 16px", borderRadius: "8px", fontWeight: 600 }}>Reintentar</button>
        </div>
      ) : isEmpty ? (
        <div style={{ padding: "60px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <MessageSquare className="w-8 h-8 mx-auto mb-4" style={{ color: "#64748b" }} />
          <h3 style={{ color: "white", fontSize: "16px", fontWeight: 600 }}>No hay datos disponibles</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Intenta seleccionar otro periodo u otra plataforma.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <KpiCard title="Total Conversaciones" value={kpis.totalConversations?.toLocaleString()} icon={MessageSquare} color="#3b82f6" />
            <KpiCard title="Contención Real" value={kpis.containmentRate ? `${kpis.containmentRate.toFixed(1)}%` : "0%"} sub="Resueltas por Bot" icon={Bot} color="#10b981" />
            <KpiCard title="Escalamiento a Agente" value={kpis.handoffRate ? `${kpis.handoffRate.toFixed(1)}%` : "0%"} sub="Transferidas a humanos" icon={User} color="#f59e0b" />
            <KpiCard title="CSAT Promedio" value={kpis.avgCsat ? kpis.avgCsat.toFixed(1) : "N/A"} sub="Satisfacción (1 a 5)" icon={HeartHandshake} color="#ec4899" />
            <KpiCard title="FRT Promedio" value={kpis.avgFrtSeconds ? `${Math.round(kpis.avgFrtSeconds)}s` : "0s"} sub="First Response Time" icon={Clock} color="#8b5cf6" />
            <KpiCard title="Ahorro Estimado (ROI)" value={`$${kpis.estimatedRoiSaved?.toLocaleString(undefined, {minimumFractionDigits: 2})}`} sub="Basado en horas agente ahorradas" icon={DollarSign} color="#14b8a6" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 16px", color: "white" }}>Evolución de Conversaciones</h3>
              <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v.substring(5)} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Line type="monotone" name="Totales" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" name="Resueltas por Bot" dataKey="botResolved" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" name="Escaladas" dataKey="handoffs" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 16px", color: "white" }}>Top Canales</h3>
              <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topChannels} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
                    />
                    <Bar dataKey="count" name="Conversaciones" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px", overflowX: "auto" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 16px", color: "white" }}>Conversaciones Recientes</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>Fecha</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>Proveedor</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>Canal</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>Estado</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>Resultado</th>
                  <th style={{ padding: "12px 8px", fontWeight: 500 }}>CSAT</th>
                </tr>
              </thead>
              <tbody>
                {recentConversations.map((conv: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", color: "#e2e8f0" }}>
                    <td style={{ padding: "12px 8px" }}>{new Date(conv.startedAt).toLocaleString()}</td>
                    <td style={{ padding: "12px 8px", textTransform: "capitalize" }}>{conv.provider.replace("_", " ")}</td>
                    <td style={{ padding: "12px 8px", textTransform: "capitalize" }}>{conv.channel}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "12px", background: "rgba(255,255,255,0.1)", fontSize: "11px" }}>{conv.status}</span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>{conv.outcome}</td>
                    <td style={{ padding: "12px 8px" }}>
                      {conv.csatScore ? (
                        <span style={{ color: conv.csatScore >= 4 ? "#10b981" : conv.csatScore <= 2 ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
                          {conv.csatScore} ⭐
                        </span>
                      ) : <span style={{ color: "#64748b" }}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
