import React from "react";
import { ShieldAlert, ThumbsUp, Activity, XOctagon } from "lucide-react";
import { KpiTooltipCard } from "../KpiTooltipCard";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function TabQuality({ data }: { data: any }) {
  const kpis = data?.kpis || {};

  // Mock data for fallbacks
  const fallbacksByIntent = [
    { name: "Desconocido", count: 120 },
    { name: "Soporte Técnico", count: 45 },
    { name: "Ventas", count: 30 },
    { name: "Facturación", count: 25 },
  ];

  return (
    <div className="space-y-6">
      
      <h3 className="text-white text-base font-bold mb-2">Calidad del Bot y Comprensión</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        
        <KpiTooltipCard 
          title="Fallback Rate" 
          value={`${kpis.fallbackRate ? kpis.fallbackRate.toFixed(1) : 0}%`} 
          sub="No entendidos por el bot"
          icon={ShieldAlert} 
          color="#ef4444" 
          formulaDef="(Total de mensajes que dispararon el Default Fallback / Total de mensajes del usuario) * 100"
          trafficLight={{ value: kpis.fallbackRate || 0, thresholds: { good: 10, warning: 20 }, isHigherBetter: false }}
        />

        <KpiTooltipCard 
          title="Task Completion" 
          value={`${kpis.taskCompletionRate ? kpis.taskCompletionRate.toFixed(1) : 0}%`} 
          sub="Objetivos completados"
          icon={Activity} 
          color="#10b981" 
          formulaDef="(Servicios Completados / Servicios Iniciados) * 100"
          trafficLight={{ value: kpis.taskCompletionRate || 0, thresholds: { good: 80, warning: 50 }, isHigherBetter: true }}
        />

        <KpiTooltipCard 
          title="CSAT (Satisfacción)" 
          value={kpis.avgCsat ? kpis.avgCsat.toFixed(1) : "N/A"} 
          sub="Calificación post-interacción"
          icon={ThumbsUp} 
          color="#3b82f6" 
          formulaDef="Promedio de todas las calificaciones (1 a 5) dejadas por los usuarios."
          trafficLight={{ value: kpis.avgCsat || 0, thresholds: { good: 4.0, warning: 3.0 }, isHigherBetter: true }}
        />

        <KpiTooltipCard 
          title="Abandono Temprano" 
          value={`${kpis.earlyAbandonmentRate ? kpis.earlyAbandonmentRate.toFixed(1) : 0}%`} 
          sub="<= 2 mensajes"
          icon={XOctagon} 
          color="#f59e0b" 
          formulaDef="(Conversaciones abandonadas con <= 2 mensajes de usuario / Total de conversaciones) * 100"
        />

      </div>

      {/* Gráficos de Calidad */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
        <h3 className="text-white text-sm font-bold mb-4">Intenciones con Mayor Fallback</h3>
        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fallbacksByIntent} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={120} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.02)" }}
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
              />
              <Bar dataKey="count" name="Fallbacks" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Forced recompile
