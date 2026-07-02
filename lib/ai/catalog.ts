/**
 * Catálogo de IAs de Sodare — NODO PRINCIPAL de la capa de inteligencia.
 *
 * Metadatos ESTÁTICOS (sin secretos): etiqueta, fabricante, puntos fuertes, modelos
 * con COSTOS por millón de tokens y qué módulos de Sodare potencia cada uno. El
 * endpoint `/api/crecimiento/providers` lo combina con `isConfigured()` (server-side)
 * para marcar cuáles tienen API key.
 *
 * Al contratar/seleccionar un modelo (PUT /api/workspace/ai-model →
 * extConfig.ariaGenerativeModel), `getWorkspaceAiProvider` lo aplica a TODO el
 * sistema: Aria Copilot (chat), Aria Insights, GridIA (parrillas multimodales) y
 * cualquier módulo nuevo que use la capa `lib/ai`.
 *
 * Precios: USD por 1M de tokens (referenciales, tarifa pública del proveedor).
 */

import type { ProviderId } from "./types";

export interface CatalogModel {
  id: string;
  label: string;
  note: string;
  /** USD por 1 millón de tokens de entrada. */
  inputPerM: number;
  /** USD por 1 millón de tokens de salida. */
  outputPerM: number;
  /** Potencia relativa 1–5 (capacidad de razonamiento/calidad de salida). */
  power: 1 | 2 | 3 | 4 | 5;
  /** Módulos de Sodare donde este modelo rinde mejor. */
  bestFor: string[];
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
    recommendedModel: "gemini-2.5-flash",
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        note: "Rápido y económico (recomendado)",
        inputPerM: 0.3,
        outputPerM: 2.5,
        power: 3,
        bestFor: ["Aria Copilot", "Aria Insights", "GridIA"],
      },
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        note: "Más capacidad, algo más lento",
        inputPerM: 1.25,
        outputPerM: 10,
        power: 4,
        bestFor: ["GridIA (parrillas complejas)", "Aria Insights profundos"],
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        note: "El más barato para alto volumen",
        inputPerM: 0.1,
        outputPerM: 0.4,
        power: 2,
        bestFor: ["Aria Copilot (chat frecuente)", "Resúmenes masivos"],
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
    recommendedModel: "gpt-4.1",
    models: [
      {
        id: "gpt-4.1",
        label: "GPT-4.1",
        note: "Equilibrado (recomendado)",
        inputPerM: 2,
        outputPerM: 8,
        power: 4,
        bestFor: ["Aria Copilot", "GridIA", "Aria Insights"],
      },
      {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 mini",
        note: "Calidad alta a bajo costo",
        inputPerM: 0.4,
        outputPerM: 1.6,
        power: 3,
        bestFor: ["Aria Copilot (chat frecuente)", "Aria Insights"],
      },
      {
        id: "gpt-4.1-nano",
        label: "GPT-4.1 nano",
        note: "El más rápido y barato de OpenAI",
        inputPerM: 0.1,
        outputPerM: 0.4,
        power: 2,
        bestFor: ["Clasificación y resúmenes de alto volumen"],
      },
      {
        id: "gpt-4o",
        label: "GPT-4o",
        note: "Multimodal y rápido",
        inputPerM: 2.5,
        outputPerM: 10,
        power: 4,
        bestFor: ["GridIA (análisis de brandbooks)", "Aria Copilot"],
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        note: "Multimodal económico",
        inputPerM: 0.15,
        outputPerM: 0.6,
        power: 2,
        bestFor: ["GridIA ligero", "Chat de alto volumen"],
      },
      {
        id: "o4-mini",
        label: "o4-mini",
        note: "Razonamiento, económico",
        inputPerM: 1.1,
        outputPerM: 4.4,
        power: 3,
        bestFor: ["Aria Insights (análisis con razonamiento)"],
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
    recommendedModel: "claude-sonnet-4-6",
    models: [
      {
        id: "claude-opus-4-8",
        label: "Claude Opus 4.8",
        note: "Máxima capacidad",
        inputPerM: 5,
        outputPerM: 25,
        power: 5,
        bestFor: ["Aria Insights estratégicos", "GridIA premium"],
      },
      {
        id: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6",
        note: "Balance costo/calidad (recomendado)",
        inputPerM: 3,
        outputPerM: 15,
        power: 4,
        bestFor: ["Aria Copilot", "Aria Insights", "GridIA"],
      },
      {
        id: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        note: "Rápido y económico",
        inputPerM: 1,
        outputPerM: 5,
        power: 3,
        bestFor: ["Aria Copilot (chat frecuente)", "Resúmenes"],
      },
    ],
    envVar: "ANTHROPIC_API_KEY",
  },
];
