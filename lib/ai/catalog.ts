/**
 * Catálogo presentable de IAs para el selector de Aria (Crecimiento).
 *
 * Metadatos ESTÁTICOS (sin secretos): etiqueta, fabricante, puntos fuertes, modelos
 * y acento visual de cada proveedor. El endpoint `/api/crecimiento/providers` lo
 * combina con `isConfigured()` (server-side) para marcar cuáles tienen API key.
 */

import type { ProviderId } from "./types";

export interface CatalogModel {
  id: string;
  label: string;
  note: string;
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
      "Multimodal (texto e imágenes)",
    ],
    accent: "from-blue-500 to-cyan-400",
    recommendedModel: "gemini-2.5-flash",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Rápido y económico (recomendado)" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Más capacidad, algo más lento" },
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
      { id: "gpt-4.1", label: "GPT-4.1", note: "Equilibrado (recomendado)" },
      { id: "gpt-4o", label: "GPT-4o", note: "Multimodal y rápido" },
      { id: "o4-mini", label: "o4-mini", note: "Razonamiento, económico" },
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
      { id: "claude-opus-4-8", label: "Claude Opus 4.8", note: "Máxima capacidad" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "Balance costo/calidad (recomendado)" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", note: "Rápido y económico" },
    ],
    envVar: "ANTHROPIC_API_KEY",
  },
];
