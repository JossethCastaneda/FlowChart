"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useState, useEffect } from "react";
import { BrainCircuit, Download } from "lucide-react";

export default function ScoresPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, PROJECT, CLIENT, VERTICAL

  useEffect(() => {
    fetch("/api/crecimiento/scores")
      .then(res => res.json())
      .then(data => {
        setPredictions(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Aria Scores" 
          description="Tus leads priorizados por IA predictiva."
        />
        <button className="flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition">
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="flex items-center gap-2 border-b pb-2">
        {["ALL", "PROJECT", "CLIENT", "VERTICAL"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab === "ALL" ? "Todos" : tab === "PROJECT" ? "Por Proyecto" : tab === "CLIENT" ? "Por Cliente" : "Por Vertical"}
          </button>
        ))}
      </div>
      
      <div className="bg-card border rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Record ID</th>
              <th className="px-4 py-3 font-medium">Prioridad</th>
              <th className="px-4 py-3 font-medium text-right">Score</th>
              <th className="px-4 py-3 font-medium text-right">Probabilidad</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Origen (Nombre)</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando scores...
                </td>
              </tr>
            ) : predictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  <BrainCircuit className="mx-auto w-8 h-8 opacity-50 mb-2" />
                  Aún no hay scores generados. Crea un nuevo proyecto o entrena un modelo.
                </td>
              </tr>
            ) : (
              predictions
                .filter(p => activeTab === "ALL" || p.model?.dataset?.targetType === activeTab)
                .map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3 font-medium">{p.recordId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      p.priority === "High" ? "bg-red-500/10 text-red-500" :
                      p.priority === "Medium" ? "bg-yellow-500/10 text-yellow-500" : 
                      "bg-blue-500/10 text-blue-500"
                    }`}>
                      {p.priority === "High" ? "Alta" : p.priority === "Medium" ? "Media" : "Baja"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{p.score}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {(p.probability * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                      {p.model?.dataset?.targetType === "VERTICAL" ? "Vertical" : 
                       p.model?.dataset?.targetType === "CLIENT" ? "Cliente" : "Proyecto"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium truncate max-w-[150px]">
                    {p.model?.dataset?.targetType === "VERTICAL" ? p.model?.dataset?.verticalName : 
                     p.model?.dataset?.targetType === "CLIENT" ? p.model?.dataset?.clientName : 
                     p.model?.dataset?.project?.name || "Sin origen"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">
                    {p.model?.name || p.modelId}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
