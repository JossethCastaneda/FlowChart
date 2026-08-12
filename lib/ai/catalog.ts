/**
 * Catálogo de IAs de FlowChart — NODO PRINCIPAL de la capa de inteligencia.
 *
 * Metadatos ESTÁTICOS (sin secretos): etiqueta, fabricante, puntos fuertes, modelos
 * con COSTOS por millón de tokens y su RENDIMIENTO en la plataforma.
 */

import type { ProviderId } from "./types";
import type { ModelCapability } from "./capabilities";

export interface CatalogModel {
  /** Identificador interno en la BD/UI de FlowChart */
  id: string;
  /** Identificador REAL para el API del proveedor (ej. gemini-1.5-pro-latest) */
  providerModelId: string;
  label: string;
  note: string;
  /** USD por 1 millón de tokens de entrada. */
  inputPerM: number;
  /** USD por 1 millón de tokens de salida. */
  outputPerM: number;
  /** Potencia relativa 1–5 (capacidad de razonamiento/calidad de salida). */
  power: 1 | 2 | 3 | 4 | 5;
  performance: string;
  /** Capacidades soportadas por este modelo */
  capabilities: ModelCapability[];
}

export interface CatalogProvider {
  id: ProviderId;
  label: string;
  vendor: string;
  tagline: string;
  strengths: string[];
  /** Clases Tailwind para el degradado del acento de la tarjeta. */
  accent: string;
  recommendedModel: string;
  models: CatalogModel[];
  /** Cómo conectarla si aún no tiene API key. */
  envVar: string;
}

export const DEFAULT_MODEL = "gemini-1.5-flash"; // Realigned to real models

export const AI_CATALOG: CatalogProvider[] = [
  {
    id: "gemini",
    label: "Gemini",
    vendor: "Google",
    tagline: "Velocidad y volumen",
    strengths: [
      "Respuestas muy rápidas y de bajo costo",
      "Ventana de contexto enorme",
      "Ideal para resúmenes y alto volumen de leads",
      "Multimodal (texto e imágenes: analiza brandbooks en GridIA)",
    ],
    accent: "from-blue-500 to-cyan-400",
    recommendedModel: "gemini-1.5-flash",
    models: [
      {
        id: "gemini-1.5-flash",
        providerModelId: "gemini-1.5-flash-latest",
        label: "Gemini 1.5 Flash",
        note: "Rápido y económico (recomendado)",
        inputPerM: 0.35,
        outputPerM: 1.05,
        power: 3,
        performance: "Respuestas casi instantáneas en toda la plataforma; ideal para la operación diaria.",
        capabilities: ["text", "structured_output", "vision", "tool_calling", "long_context", "streaming"],
      },
      {
        id: "gemini-1.5-pro",
        providerModelId: "gemini-1.5-pro-latest",
        label: "Gemini 1.5 Pro",
        note: "Más capacidad, algo más lento",
        inputPerM: 3.5,
        outputPerM: 10.5,
        power: 4,
        performance: "Mayor profundidad de análisis en tareas complejas.",
        capabilities: ["text", "structured_output", "vision", "tool_calling", "long_context", "reasoning", "streaming"],
      },
    ],
    envVar: "GEMINI_API_KEY",
  },
  {
    id: "openai",
    label: "GPT",
    vendor: "OpenAI",
    tagline: "Versátil y equilibrado",
    strengths: [
      "Razonamiento sólido y versátil",
      "Excelente seguimiento de instrucciones",
      "Ecosistema y herramientas maduras",
      "Buen balance calidad / velocidad",
    ],
    accent: "from-emerald-500 to-teal-400",
    recommendedModel: "gpt-4o",
    models: [
      {
        id: "gpt-4o",
        providerModelId: "gpt-4o",
        label: "GPT-4o",
        note: "Equilibrado (recomendado)",
        inputPerM: 5,
        outputPerM: 15,
        power: 4,
        performance: "Equilibrio sólido entre razonamiento y velocidad.",
        capabilities: ["text", "structured_output", "vision", "tool_calling", "streaming"],
      },
      {
        id: "gpt-4o-mini",
        providerModelId: "gpt-4o-mini",
        label: "GPT-4o mini",
        note: "Multimodal económico",
        inputPerM: 0.15,
        outputPerM: 0.6,
        power: 3,
        performance: "Alta calidad a una fracción del costo.",
        capabilities: ["text", "structured_output", "vision", "tool_calling", "streaming"],
      },
      {
        id: "o1-mini",
        providerModelId: "o1-mini",
        label: "o1-mini",
        note: "Razonamiento estructurado",
        inputPerM: 3,
        outputPerM: 12,
        power: 5,
        performance: "Razonamiento profundo para resolución de problemas complejos.",
        capabilities: ["text", "reasoning", "streaming"], // usually no tool_calling/structured_output for o1-mini in some APIs, mapping conservatively
      },
    ],
    envVar: "OPENAI_API_KEY",
  },
  {
    id: "anthropic",
    label: "Claude",
    vendor: "Anthropic",
    tagline: "Análisis profundo",
    strengths: [
      "Razonamiento largo y matizado",
      "El mejor para análisis y redacción de negocio",
      "Seguimiento de instrucciones muy fiel",
      "Fuerte en tareas agénticas y contexto largo",
    ],
    accent: "from-orange-500 to-amber-400",
    recommendedModel: "claude-3-5-sonnet",
    models: [
      {
        id: "claude-3-opus",
        providerModelId: "claude-3-opus-20240229",
        label: "Claude 3 Opus",
        note: "Máxima capacidad",
        inputPerM: 15,
        outputPerM: 75,
        power: 5,
        performance: "La máxima capacidad del catálogo; profundidad y criterio superiores.",
        capabilities: ["text", "vision", "tool_calling", "long_context", "streaming"],
      },
      {
        id: "claude-3-5-sonnet",
        providerModelId: "claude-3-5-sonnet-20240620",
        label: "Claude 3.5 Sonnet",
        note: "Balance costo/calidad (recomendado)",
        inputPerM: 3,
        outputPerM: 15,
        power: 4,
        performance: "Análisis matizado y velocidad superior.",
        capabilities: ["text", "vision", "tool_calling", "long_context", "structured_output", "streaming"],
      },
      {
        id: "claude-3-haiku",
        providerModelId: "claude-3-haiku-20240307",
        label: "Claude 3 Haiku",
        note: "Rápido y económico",
        inputPerM: 0.25,
        outputPerM: 1.25,
        power: 3,
        performance: "Rápido y confiable; excelente relación velocidad-calidad.",
        capabilities: ["text", "vision", "tool_calling", "streaming"],
      },
    ],
    envVar: "ANTHROPIC_API_KEY",
  },
];
