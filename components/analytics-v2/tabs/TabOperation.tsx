import React from "react";
import { MessageSquare, Bot, User, Clock, AlertTriangle, PlayCircle, CheckCircle } from "lucide-react";
import { KpiTooltipCard } from "../KpiTooltipCard";
import { FilterState } from "../AdvancedAnalyticsDashboard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";

export function TabOperation({ data, filters }: { data: any, filters: FilterState }) {
  const kpis = data?.kpis || {};
  const trends = data?.charts?.trends || [];

  return (
    <div className="space-y-6">
      
      {/* SECCIÓN: KPIs de Operación */}
      <h3 className="text-white text-base font-bold mb-2">Métricas Operativas</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        
        <KpiTooltipCard 
          title="Total Conversaciones" 
          value={kpis.totalConversations?.toLocaleString()} 
          icon={MessageSquare} 
          color="var(--cyan)" 
          formulaDef="Conteo de todas las interacciones (sesiones) que entraron a la plataforma en el periodo seleccionado."
        />

        <KpiTooltipCard 
          title="Contención Real" 
          value={`${kpis.containmentRate ? kpis.containmentRate.toFixed(1) : 0}%`} 
          sub="Resueltas sin tocar humano"
          icon={Bot} 
          color="var(--emerald)" 
          formulaDef="(Conversaciones con outcome 'resuelto_por_bot' / Total de conversaciones cerradas) * 100"
          trafficLight={{ value: kpis.containmentRate || 0, thresholds: { good: 70, warning: 50 }, isHigherBetter: true }}
        />

        <KpiTooltipCard 
          title="Resolución 1er Contacto (FCR)" 
          value={`${kpis.fcrRate ? kpis.fcrRate.toFixed(1) : 0}%`} 
          sub="Sin recontacto en 24h"
          icon={CheckCircle} 
          color="var(--purple)" 
          formulaDef="(Resoluciones en primer contacto / Total de consultas resueltas) * 100"
          trafficLight={{ value: kpis.fcrRate || 0, thresholds: { good: 85, warning: 60 }, isHigherBetter: true }}
        />

        <KpiTooltipCard 
          title="Escalamiento (Handoff)" 
          value={`${kpis.handoffRate ? kpis.handoffRate.toFixed(1) : 0}%`} 
          sub="Transferencias a Agente"
          icon={User} 
          color="var(--amber)" 
          formulaDef="(Conversaciones transferidas a un agente humano / Total de conversaciones) * 100"
          trafficLight={{ value: kpis.handoffRate || 0, thresholds: { good: 15, warning: 30 }, isHigherBetter: false }}
        />

        <KpiTooltipCard 
          title="FRT (First Response Time)" 
          value={`${Math.round(kpis.avgFrtSeconds || 0)}s`} 
          sub="Tiempo de 1ra respuesta (Agente)"
          icon={Clock} 
          color="var(--purple)" 
          formulaDef="Promedio de (Fecha_1ra_Respuesta_Agente - Fecha_Asignacion_Agente) en segundos."
          trafficLight={{ value: kpis.avgFrtSeconds || 0, thresholds: { good: 60, warning: 300 }, isHigherBetter: false }}
        />

        <KpiTooltipCard 
          title="Abandono" 
          value={`${kpis.abandonmentRate ? kpis.abandonmentRate.toFixed(1) : 0}%`} 
          icon={AlertTriangle} 
          color="var(--red)" 
          formulaDef="(Conversaciones abandonadas en cola o sin interacción / Total de conversaciones) * 100"
          trafficLight={{ value: kpis.abandonmentRate || 0, thresholds: { good: 5, warning: 15 }, isHigherBetter: false }}
        />

        <KpiTooltipCard 
          title="AHT (Handle Time)" 
          value={`${Math.round(kpis.avgAhtSeconds || 0)}s`} 
          sub="Tiempo de resolución (Agente)"
          icon={PlayCircle} 
          color="var(--cyan)" 
          formulaDef="Promedio de (Fecha_Resolución - Fecha_Asignacion_Agente) en segundos."
        />
      </div>

      {/* SECCIÓN: Gráficas de Tendencia */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        
        {/* Gráfico 1: Evolución de Volumen */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--hairline)", borderRadius: "12px", padding: "20px" }}>
          <h3 className="text-white text-sm font-bold mb-4">Evolución de Volumen (Bot vs Humano)</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => v.substring(5)} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--foreground)", borderColor: "var(--surface)", borderRadius: "8px", color: "var(--foreground)" }} />
                <Area type="monotone" dataKey="total" stroke="var(--cyan)" fillOpacity={1} fill="url(#colorTotal)" name="Totales" />
                <Line type="monotone" dataKey="botResolved" stroke="var(--emerald)" strokeWidth={2} dot={false} name="Resueltas por Bot" />
                <Line type="monotone" dataKey="handoffs" stroke="var(--amber)" strokeWidth={2} dot={false} name="Escaladas a Agente" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Comparativa de Plataformas (Si el filtro lo pide) */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--hairline)", borderRadius: "12px", padding: "20px" }}>
          <h3 className="text-white text-sm font-bold mb-4">
            {filters.platform === "compare" ? "Comparativa Cari AI vs Botmaker (Contención)" : "Tiempos Promedio (FRT vs AHT)"}
          </h3>
          <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
            {/* TODO: Inyectar datos comparativos reales de Cari vs Botmaker */}
            {filters.platform === "compare" ? (
               <p className="text-sm">Gráfico comparativo de plataformas disponible pronto.</p>
            ) : (
               <p className="text-sm">Gráfico de tiempos en construcción.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
