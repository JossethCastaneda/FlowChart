"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { BrainCircuit, Target, TrendingUp, Users } from "lucide-react";

export default function CrecimientoInsights() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Aria Insights" 
        description="Métricas globales de tus modelos predictivos."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Leads Analizados" value="0" icon={<Users className="w-5 h-5" />} context="+0% esta semana" />
        <KpiCard label="Modelos Entrenados" value="0" icon={<BrainCircuit className="w-5 h-5" />} context="MVP Version" />
        <KpiCard label="Alta Intención" value="0" icon={<Target className="w-5 h-5" />} context="0% conversión est." />
        <KpiCard label="Lift Predictivo" value="0x" icon={<TrendingUp className="w-5 h-5" />} context="Mejora vs manual" />
      </div>

      <div className="p-12 text-center border rounded-xl bg-card">
        <BrainCircuit className="mx-auto w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">Bienvenido a Aria Predictive AI</h3>
        <p className="text-muted-foreground max-w-lg mx-auto">
          No tienes modelos entrenados. Dirígete a <strong>Data Hub</strong> para subir tu primer CSV con leads históricos.
        </p>
      </div>
    </div>
  );
}
