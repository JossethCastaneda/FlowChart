"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { useState, useEffect } from "react";
import { BrainCircuit, Target, TrendingUp, Users } from "lucide-react";
import Link from "next/link";

export default function CrecimientoInsights() {
  const [stats, setStats] = useState({
    modelsCount: 0,
    totalLeadsAnalizados: 0,
    highIntentLeads: 0,
    lift: "0x"
  });

  useEffect(() => {
    fetch("/api/crecimiento/summary")
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Aria Insights" 
        description="Métricas globales de tus modelos predictivos."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Leads Analizados" value={stats.totalLeadsAnalizados.toString()} icon={<Users className="w-5 h-5" />} context="+0% esta semana" />
        <KpiCard label="Modelos Entrenados" value={stats.modelsCount.toString()} icon={<BrainCircuit className="w-5 h-5" />} context="MVP Version" />
        <KpiCard label="Alta Intención" value={stats.highIntentLeads.toString()} icon={<Target className="w-5 h-5" />} context="0% conversión est." />
        <KpiCard label="Lift Predictivo" value={stats.lift} icon={<TrendingUp className="w-5 h-5" />} context="Mejora vs manual" />
      </div>

      {stats.modelsCount === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-card">
          <BrainCircuit className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Bienvenido a Aria Predictive AI</h3>
          <p className="text-muted-foreground max-w-lg mx-auto">
            No tienes modelos entrenados. Dirígete a <strong>Data Hub</strong> para subir tu primer CSV con leads históricos, o crea un <strong>Proyecto nuevo</strong> para auto-generar modelos.
          </p>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-xl bg-card">
          <Target className="mx-auto w-12 h-12 text-primary mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2">¡Aria está optimizando tu embudo!</h3>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Tienes {stats.modelsCount} modelos predictivos en operación analizando {stats.totalLeadsAnalizados} prospectos.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard/crecimiento/scores" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
              Ver Leads Priorizados
            </Link>
            <Link href="/dashboard/crecimiento/studio" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium">
              Ir a Predictive Studio
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
