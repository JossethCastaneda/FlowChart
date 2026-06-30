"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useState, useEffect } from "react";
import { BrainCircuit, Play, BarChart, CheckCircle } from "lucide-react";
import { Orbi } from "@/components/ui/Orbi";

export default function PredictiveStudio() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Fetch available datasets
    fetch("/api/crecimiento/datasets")
      .then(res => res.json())
      .then(data => setDatasets(data))
      .catch(console.error);
  }, []);

  const handleTrain = async () => {
    if (!selectedDataset) return;
    setTraining(true);
    setResult(null);

    try {
      const res = await fetch("/api/crecimiento/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: selectedDataset })
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Aria Predictive Studio" 
        description="Entrena modelos de Machine Learning automáticamente."
      />
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            Configuración de Modelo
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Dataset Base
              </label>
              <select 
                className="w-full bg-background border rounded-md p-2 text-sm"
                value={selectedDataset}
                onChange={e => setSelectedDataset(e.target.value)}
              >
                <option value="">Selecciona un dataset...</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.rowCount} filas)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Algoritmo (AutoML)
              </label>
              <select className="w-full bg-background border rounded-md p-2 text-sm" disabled>
                <option>AutoML (Selección Automática)</option>
              </select>
            </div>

            <button 
              disabled={!selectedDataset || training}
              onClick={handleTrain}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {training ? (
                "Entrenando modelo..."
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Iniciar Entrenamiento
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-4">
            <Orbi state={training ? "thinking" : result ? "idle" : "idle"} />
            <p className="text-sm text-muted-foreground font-medium">
              {training ? "Entrenando modelo... Estoy probando Random Forest y Logistic Regression." : result ? "¡Entrenamiento completado! Revisa las métricas." : "Selecciona un dataset para comenzar el entrenamiento predictivo."}
            </p>
          </div>
          
          {result && (
            <div className="mt-6 bg-card border rounded-xl p-6">
              <h3 className="font-semibold text-green-500 flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" />
                Resultados del Modelo ({result.model.algorithm})
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-background text-center">
                  <div className="text-2xl font-bold text-blue-500">{(result.model.accuracy * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
                <div className="p-4 border rounded-lg bg-background text-center">
                  <div className="text-2xl font-bold text-purple-500">{(result.model.auc * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">AUC</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
