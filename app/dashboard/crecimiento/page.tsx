"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { useState, useEffect } from "react";
import { BrainCircuit, Target, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function CrecimientoInsights() {
  const [stats, setStats] = useState({
    modelsCount: 0,
    totalLeadsAnalizados: 0,
    highIntentLeads: 0,
    lift: "0x"
  });
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    fetch("/api/crecimiento/summary")
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.data) {
          setStats(data.data);
          if (data.data.modelsCount > 0) {
            setLoadingInsights(true);
            fetch("/api/crecimiento/insights")
              .then(res => res.json())
              .then(resData => {
                if (resData?.success) setInsights(resData.data);
              })
              .catch(console.error)
              .finally(() => setLoadingInsights(false));
          }
        }
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
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            No tienes modelos entrenados. Dirígete a <strong>Data Hub</strong> para subir tu primer CSV con leads históricos, o crea un <strong>Proyecto nuevo</strong> para auto-generar modelos.
          </p>
          <Link href="/dashboard/crecimiento/copilot" className="border px-4 py-2 rounded-md font-medium inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Elegir tu IA (GPT, Gemini o Claude)
          </Link>
        </div>
      ) : (
        <div className="p-12 text-center border rounded-xl bg-card">
          <Target className="mx-auto w-12 h-12 text-primary mb-4 opacity-80" />
          <h3 className="text-xl font-semibold mb-2">¡Aria está optimizando tu embudo!</h3>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Tienes {stats.modelsCount} modelos predictivos en operación analizando {stats.totalLeadsAnalizados} prospectos.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/dashboard/crecimiento/scores" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
              Ver Leads Priorizados
            </Link>
            <Link href="/dashboard/crecimiento/studio" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium">
              Ir a Predictive Studio
            </Link>
            <Link href="/dashboard/crecimiento/copilot" className="border px-4 py-2 rounded-md font-medium inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Elegir IA y conversar
            </Link>
          </div>

          {loadingInsights && (
            <div className="mt-8 pt-6 border-t flex flex-col items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
              <p className="text-sm text-muted-foreground">Generando insights accionables con Aria AI...</p>
            </div>
          )}

          {insights && !loadingInsights && (
            <div className="mt-8 pt-6 border-t text-left">
              <h4 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Recomendaciones de Aria Copilot
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-semibold text-sm mb-2 text-primary">Análisis Actual</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insights.analysis}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h5 className="font-semibold text-sm mb-2 text-primary">Recomendación Estratégica</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insights.recommendation}</p>
                </div>
              </div>
              {insights.anomalies && insights.anomalies.length > 0 && (
                <div className="mt-4 bg-muted/50 p-4 rounded-lg border border-amber-500/20">
                  <h5 className="font-semibold text-sm mb-2 text-amber-600">Anomalías Detectadas</h5>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {insights.anomalies.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
