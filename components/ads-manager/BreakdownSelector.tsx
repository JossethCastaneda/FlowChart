import React, { useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";

interface BreakdownSelectorProps {
  selectedBreakdown: string;
  onChange: (breakdown: string) => void;
}

const BREAKDOWNS = [
  { key: "none", label: "Sin desglose" },
  { key: "day", label: "Por día" },
  { key: "week", label: "Por semana" },
  { key: "month", label: "Por mes" },
  { key: "age", label: "Edad" },
  { key: "gender", label: "Sexo" },
  { key: "age_gender", label: "Edad y sexo" },
  { key: "country", label: "País" },
  { key: "region", label: "Región" },
  { key: "dma", label: "Área de mercado (DMA)" },
  { key: "platform", label: "Plataforma" },
  { key: "placement", label: "Ubicación" },
  { key: "device", label: "Plataforma de dispositivo" },
  { key: "time_of_day", label: "Hora del día" },
  { key: "conversion_device", label: "Dispositivo de conversión" },
  { key: "destination", label: "Destino" },
  { key: "dynamic_image", label: "Imagen / Video (Contenido dinámico)" },
  { key: "dynamic_text", label: "Texto principal (Contenido dinámico)" },
  { key: "dynamic_headline", label: "Título (Contenido dinámico)" },
  { key: "dynamic_description", label: "Descripción (Contenido dinámico)" },
  { key: "dynamic_cta", label: "Llamada a la acción (Contenido dinámico)" },
];

export function BreakdownSelector({ selectedBreakdown, onChange }: BreakdownSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = BREAKDOWNS.find((b) => b.key === selectedBreakdown) || BREAKDOWNS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "var(--fc-surface)",
          border: "1px solid var(--fc-border)",
          borderRadius: "6px",
          color: "var(--fc-text-secondary)",
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--fc-border)";
          e.currentTarget.style.color = "var(--fc-text-secondary)";
        }}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Desglose: {currentOption.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "4px",
              background: "var(--fc-surface)",
              
              border: "1px solid var(--border-strong)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              zIndex: 50,
              padding: "6px",
              width: "160px",
            }}
          >
            {BREAKDOWNS.map((bd) => {
              const isSelected = bd.key === selectedBreakdown;
              return (
                <button
                  key={bd.key}
                  onClick={() => {
                    onChange(bd.key);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    background: isSelected ? "rgba(0,129,251,0.15)" : "transparent",
                    border: "none",
                    color: isSelected ? "var(--fc-accent)" : "var(--fc-text-secondary)",
                    fontSize: "11px",
                    fontWeight: isSelected ? 600 : 500,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--row-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {bd.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
