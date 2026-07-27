"use client";

import React, { useState } from "react";
import { X, Plus, BarChart2, Hash } from "lucide-react";
import type { DynamicChartConfig, DynamicKpiConfig } from "./widgets/DynamicWidgetTemplates";

export type WidgetType = "DynamicComposedChart" | "DynamicKpiCard";

interface WidgetBuilderModalProps {
  onClose: () => void;
  onAdd: (type: WidgetType, config: any, colSpan: number) => void;
  availableMetrics: { key: string; label: string; type: "currency" | "percentage" | "number" }[];
}

export function WidgetBuilderModal({ onClose, onAdd, availableMetrics }: WidgetBuilderModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  const handleNext = () => {
    if (selectedType) setStep(2);
  };

  const handleSave = () => {
    if (!title || selectedMetrics.length === 0) return;

    if (selectedType === "DynamicKpiCard") {
      const metric = availableMetrics.find((m) => m.key === selectedMetrics[0]);
      if (!metric) return;
      const config: DynamicKpiConfig = {
        title,
        dataKey: metric.key,
        isCurrency: metric.type === "currency",
        isPercentage: metric.type === "percentage",
      };
      onAdd(selectedType, config, 1);
    } else if (selectedType === "DynamicComposedChart") {
      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
      const config: DynamicChartConfig = {
        title,
        series: selectedMetrics.map((key, i) => {
          const metric = availableMetrics.find((m) => m.key === key);
          return {
            dataKey: key,
            label: metric?.label || key,
            type: "line",
            color: colors[i % colors.length],
            yAxisId: i === 0 ? "left" : "right",
            isCurrency: metric?.type === "currency",
            isPercentage: metric?.type === "percentage",
          };
        }),
      };
      onAdd(selectedType, config, 2);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Añadir Gráfico</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">Selecciona el tipo de visualización:</p>
              
              <button
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${selectedType === "DynamicComposedChart" ? "border-[var(--brand)] bg-[var(--brand)]/10" : "border-[var(--border)] hover:bg-[var(--surface-hover)]"}`}
                onClick={() => setSelectedType("DynamicComposedChart")}
              >
                <div className="p-2 bg-[var(--surface)] rounded-md"><BarChart2 size={24} className="text-[var(--brand)]" /></div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Gráfico de Líneas/Barras</h3>
                  <p className="text-xs text-[var(--text-muted)]">Compara métricas a lo largo del tiempo</p>
                </div>
              </button>

              <button
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${selectedType === "DynamicKpiCard" ? "border-[var(--brand)] bg-[var(--brand)]/10" : "border-[var(--border)] hover:bg-[var(--surface-hover)]"}`}
                onClick={() => setSelectedType("DynamicKpiCard")}
              >
                <div className="p-2 bg-[var(--surface)] rounded-md"><Hash size={24} className="text-[var(--brand)]" /></div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">Tarjeta de KPI</h3>
                  <p className="text-xs text-[var(--text-muted)]">Muestra un único valor totalizado</p>
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Título del Widget</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Evolución de Resultados"
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Métricas</label>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  {selectedType === "DynamicKpiCard" ? "Selecciona 1 métrica" : "Selecciona hasta 2 métricas"}
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {availableMetrics.map((m) => {
                    const isSelected = selectedMetrics.includes(m.key);
                    return (
                      <label key={m.key} className="flex items-center gap-2 p-2 rounded-md hover:bg-[var(--surface-hover)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedMetrics(selectedMetrics.filter(k => k !== m.key));
                            } else {
                              if (selectedType === "DynamicKpiCard") {
                                setSelectedMetrics([m.key]); // Only 1
                              } else {
                                if (selectedMetrics.length < 2) {
                                  setSelectedMetrics([...selectedMetrics, m.key]);
                                }
                              }
                            }
                          }}
                          className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--brand)] focus:ring-[var(--brand)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--surface)]/50">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
              Atrás
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={!selectedType}
              className="px-4 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-dark)] transition-colors"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!title || selectedMetrics.length === 0}
              className="px-4 py-2 bg-[var(--brand)] text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--brand-dark)] transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> Crear Widget
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
