import React from "react";
import { DollarSign, Clock, Users, Briefcase } from "lucide-react";
import { KpiTooltipCard } from "../KpiTooltipCard";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

export function TabRoi({ data }: { data: any }) {
  const kpis = data?.kpis || {};

  // Mock data for ROI visualization
  const savingsByMonth = [
    { name: "Ene", savings: 1200 },
    { name: "Feb", savings: 1500 },
    { name: "Mar", savings: 2100 },
    { name: "Abr", savings: 1800 },
    { name: "May", savings: 2400 },
    { name: "Jun", savings: kpis.estimatedRoiSaved || 2800 }, // Current month
  ];

  return (
    <div className="space-y-6">
      
      <h3 className="text-white text-base font-bold mb-2">Retorno de Inversión (ROI) Estimado</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        
        <KpiTooltipCard 
          title="Ahorro Total Estimado" 
          value={`$${kpis.estimatedRoiSaved?.toLocaleString(undefined, {minimumFractionDigits: 2}) || "0.00"}`} 
          sub="Basado en horas agente ahorradas"
          icon={DollarSign} 
          color="#10b981" 
          formulaDef="Conversaciones resueltas por bot * (AHT Base Humano en horas) * Costo hora de un agente"
        />

        <KpiTooltipCard 
          title="Horas Agente Ahorradas" 
          value={`${Math.round((kpis.estimatedRoiSaved || 0) / 10)}h`} 
          sub="Tiempo devuelto a la operación"
          icon={Clock} 
          color="#3b82f6" 
          formulaDef="Conversaciones resueltas por bot * (AHT Base Humano en horas)"
        />

        <KpiTooltipCard 
          title="Equivalencia en Personal (FTE)" 
          value={((kpis.estimatedRoiSaved || 0) / 10 / 160).toFixed(1)} 
          sub="Agentes a tiempo completo"
          icon={Users} 
          color="#a855f7" 
          formulaDef="Horas Agente Ahorradas / 160 horas laborales al mes"
        />

        <KpiTooltipCard 
          title="Costo por Interacción (CPA)" 
          value="$0.12" 
          sub="Promedio de costo de API/Mensajería"
          icon={Briefcase} 
          color="#f59e0b" 
          formulaDef="Gasto total en plataforma / Total de conversaciones."
        />

      </div>

      {/* Gráficos de ROI */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "20px" }}>
        <h3 className="text-white text-sm font-bold mb-4">Ahorro Estimado por Mes (USD)</h3>
        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.02)" }}
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", fontSize: "12px", color: "#f8fafc" }}
                formatter={(value: any) => [`$${value}`, "Ahorro"]}
              />
              <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
