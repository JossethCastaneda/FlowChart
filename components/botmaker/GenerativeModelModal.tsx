"use client";

import React, { useState } from "react";
import { X, Search, CheckCircle2, Circle, Sparkles, Bot, Info } from "lucide-react";
import { HScroller } from "@/components/ui/HScroller";

export type GenerativeModelDef = {
  id: string;
  name: string;
  provider: "Open AI" | "Google";
  recommended?: boolean;
  features: string[];
  useCase: string;
  cost: number;
};

const MODELS: GenerativeModelDef[] = [
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "Open AI",
    recommended: true,
    features: ["Potencia y contexto", "Tareas complejas y análisis de código"],
    useCase: "Prioridad en calidad de respuesta con coste y latencia mayores",
    cost: 1.60
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    provider: "Open AI",
    features: ["Programación agéntica y uso de computadoras", "Alta eficiencia en investigación y análisis de datos"],
    useCase: "Recomendado para automatizaciones complejas, programación agéntica e investigaciones que requieren razonamiento sostenido",
    cost: 30.00
  },
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "Open AI",
    features: ["Máxima inteligencia para flujos profesionales y agentes", "Alto rendimiento en código y razonamiento complejo"],
    useCase: "Recomendado para tareas complejas que requieren máxima precisión y profundidad",
    cost: 15.00
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "Open AI",
    features: ["Potente modelo compacto para código y agentes", "Buen equilibrio entre rendimiento y costo"],
    useCase: "Ideal cuando se busca calidad con menor costo y buena eficiencia",
    cost: 4.50
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    provider: "Open AI",
    features: ["Velocidad extrema y bajo costo", "Tareas sencillas, masivas y rápidas"],
    useCase: "Ideal para tareas simples de alto volumen donde el costo es prioritario",
    cost: 1.25
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "Open AI",
    features: ["Razonamiento avanzado con lógica mejorada para resolución de problemas", "Velocidad de procesamiento optimizada para interacciones de alta demanda"],
    useCase: "Recomendado para tareas de redacción técnica, soporte especializado y procesamiento de lenguaje natural de alta calidad",
    cost: 14.00
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    provider: "Open AI",
    features: ["Confiabilidad y reducción de errores", "Optimizado para flujos de trabajo profesionales y ejecución de código"],
    useCase: "Recomendado para automatización de tareas, análisis de hojas de cálculo y resultados que requieren mínima supervisión humana",
    cost: 10.00
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "Open AI",
    features: ["Velocidad extrema y bajo costo", "Tareas muy sencillas, masivas y rápidas"],
    useCase: "Ideal para tareas muy sencillas o preprocesado en masa",
    cost: 0.40
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "Open AI",
    features: ["Buen balance entre calidad y costo", "Capacidad sólida en razonamiento y contexto extendido"],
    useCase: "Adecuado para resultados confiables y consistentes con buen equilibrio",
    cost: 8.00
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "Open AI",
    features: ["Equilibrio y multimodal", "Mayoría de aplicaciones de producción"],
    useCase: "Recomendado para la mayoría de aplicaciones de producción",
    cost: 0.60
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "Open AI",
    features: ["Equilibrio entre velocidad, costo y calidad", "Buen rendimiento en texto y razonamiento general"],
    useCase: "Una buena opción cuando se busca calidad con menor costo y buena eficiencia",
    cost: 2.00
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    provider: "Open AI",
    features: ["Máxima velocidad y bajo costo por interacción", "Adecuado para respuestas simples y directas"],
    useCase: "Ideal para respuestas inmediatas en contextos donde importa más la rapidez y el costo reducido",
    cost: 0.40
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "Open AI",
    features: ["Máxima capacidad de razonamiento y comprensión", "Alto rendimiento en contextos largos y tareas complejas"],
    useCase: "Recomendado cuando se necesita máxima precisión y profundidad",
    cost: 10.00
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    features: ["Rendimiento multimodal y agéntico de última generación", "Alta velocidad con hasta 1 millón de tokens de contexto"],
    useCase: "Recomendado para automatizaciones agénticas, programación iterativa y workflows complejos donde la velocidad y el costo son importantes",
    cost: 9.00
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    provider: "Google",
    features: ["Razonamiento avanzado y resolución de problemas complejos", "Capacidades potentes para agentes y código"],
    useCase: "Recomendado para tareas complejas que requieren razonamiento profundo y precisión",
    cost: 18.00
  }
];

interface GenerativeModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (modelId: string) => void;
  initialSelectedId?: string;
}

export function GenerativeModelModal({ isOpen, onClose, onSave, initialSelectedId = "gpt-4.1-mini" }: GenerativeModelModalProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [searchQuery, setSearchQuery] = useState("");
  if (!isOpen) return null;

  const filteredModels = MODELS.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.useCase.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white text-blue-600">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Modelo generativo</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-700">Selecciona el modelo que deseas utilizar:</h3>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-400"
                />
              </div>
              
            </div>
          </div>

          {/* Cards container */}
          <HScroller ariaLabel="Modelos generativos" className="-mx-2 px-2">
            {filteredModels.map((model) => {
              const isSelected = selectedId === model.id;
              
              return (
                <div 
                  key={model.id}
                  onClick={() => setSelectedId(model.id)}
                  className={`flex-shrink-0 w-80 rounded-xl cursor-pointer transition-all snap-start flex flex-col relative overflow-hidden border ${
                    isSelected 
                      ? 'border-blue-500 shadow-md ring-1 ring-blue-500' 
                      : 'border-transparent bg-[#f5f6f8] hover:shadow-md'
                  }`}
                >
                  {/* "Recomendado" Badge */}
                  {model.recommended && (
                    <div className="absolute top-0 right-0 bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-1 rounded-bl-lg rounded-tr-xl">
                      Recomendado
                    </div>
                  )}

                  {/* Card Header */}
                  <div className={`p-5 flex items-start gap-3 rounded-t-xl ${isSelected ? 'bg-blue-50/30' : 'bg-[#eff0f3]'}`}>
                    <div className="mt-1 flex-shrink-0 text-gray-700">
                      {model.provider === "Google" ? (
                        <Sparkles className="w-5 h-5 text-blue-400" fill="currentColor" />
                      ) : (
                        <div className="w-5 h-5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-aperture"><circle cx="12" cy="12" r="10"/><path d="m14.31 8 5.74 9.94"/><path d="M9.69 8h11.48"/><path d="m7.38 12 5.74-9.94"/><path d="M9.69 16 3.95 6.06"/><path d="M14.31 16H2.83"/><path d="m16.62 12-5.74 9.94"/></svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg leading-tight">{model.name}</h4>
                      <p className="text-xs text-gray-500">by {model.provider}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className={`p-5 flex-1 flex flex-col gap-4 ${isSelected ? 'bg-white' : ''}`}>
                    <ul className="flex flex-col gap-3">
                      {model.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-4">
                      <p className="text-sm text-blue-600 text-center px-2 leading-snug min-h-[60px] flex items-center justify-center">
                        {model.useCase}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className={`p-5 border-t border-gray-100 flex items-center justify-between ${isSelected ? 'bg-white' : ''}`}>
                    <span className="text-gray-600 font-medium text-sm">Costo</span>
                    <div className="text-right">
                      <div className="text-blue-600 font-bold text-lg">
                        US$ {model.cost.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                        por 1 millón de tokens
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </HScroller>

          {filteredModels.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No se encontraron modelos que coincidan con la búsqueda.
            </div>
          )}

          {/* Info Banner */}
          <div className="mt-6 bg-[#eef2ff] rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">
              Botmaker utiliza un motor de IA propietario con soluciones como agentes de IA, bases de datos vectoriales y búsquedas de texto indexado. El modelo generativo (LLM) que configuras aquí impacta en el desempeño de estas funcionalidades. Puedes ver tu consumo detallado haciendo click <a href="#" className="text-blue-600 font-medium underline">aquí</a>.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-full text-sm font-medium transition-colors"
          >
            Descartar
          </button>
          <button 
            onClick={() => onSave(selectedId)}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-full text-sm font-medium transition-colors shadow-sm"
          >
            Guardar
          </button>
        </div>

      </div>
    </div>
  );
}
