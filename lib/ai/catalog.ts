/**
 * Catálogo de IAs de Sodare — NODO PRINCIPAL de la capa de inteligencia.
 *
 * Metadatos ESTÁTICOS (sin secretos): etiqueta, fabricante, puntos fuertes, modelos
 * con COSTOS por millón de tokens y su RENDIMIENTO en la plataforma. El endpoint
 * `/api/crecimiento/providers` lo combina con `isConfigured()` (server-side)
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
  /**
   * Rendimiento en la plataforma (texto ejecutivo). La IA contratada potencia
   * TODOS los módulos por igual; este texto describe el perfil del modelo
   * (velocidad, profundidad, costo), no módulos específicos.
   */
  performance: string;
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
        performance:
          "Respuestas casi instantáneas en toda la plataforma; ideal para la operación diaria de alto volumen a costo muy bajo.",
      },
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        note: "Más capacidad, algo más lento",
        inputPerM: 1.25,
        outputPerM: 10,
        power: 4,
        performance:
          "Mayor profundidad de análisis en tareas complejas, manteniendo fluidez en toda la plataforma.",
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite",
        note: "El más barato para alto volumen",
        inputPerM: 0.1,
        outputPerM: 0.4,
        power: 2,
        performance:
          "El costo más bajo del catálogo; rendimiento ágil para flujos masivos y repetitivos en toda la plataforma.",
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
        performance:
          "Equilibrio sólido entre razonamiento y velocidad; rendimiento consistente en todos los flujos de la plataforma.",
      },
      {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 mini",
        note: "Calidad alta a bajo costo",
        inputPerM: 0.4,
        outputPerM: 1.6,
        power: 3,
        performance:
          "Alta calidad a una fracción del costo; fluido en el uso intensivo diario de toda la plataforma.",
      },
      {
        id: "gpt-4.1-nano",
        label: "GPT-4.1 nano",
        note: "El más rápido y barato de OpenAI",
        inputPerM: 0.1,
        outputPerM: 0.4,
        power: 2,
        performance:
          "El más veloz de OpenAI; óptimo para tareas cortas y clasificación a gran escala en la plataforma.",
      },
      {
        id: "gpt-4o",
        label: "GPT-4o",
        note: "Multimodal y rápido",
        inputPerM: 2.5,
        outputPerM: 10,
        power: 4,
        performance:
          "Multimodal y rápido; sobresale analizando imágenes y documentos en cualquier flujo de la plataforma.",
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        note: "Multimodal económico",
        inputPerM: 0.15,
        outputPerM: 0.6,
        power: 2,
        performance:
          "Multimodal económico; desempeño general sólido con costos contenidos en toda la plataforma.",
      },
      {
        id: "o4-mini",
        label: "o4-mini",
        note: "Razonamiento, económico",
        inputPerM: 1.1,
        outputPerM: 4.4,
        power: 3,
        performance:
          "Razonamiento estructurado a bajo costo; destaca en análisis y toma de decisiones en la plataforma.",
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
        performance:
          "La máxima capacidad del catálogo; profundidad y criterio superiores en cada rincón de la plataforma.",
      },
      {
        id: "claude-sonnet-4-6",
        label: "Claude Sonnet 4.6",
        note: "Balance costo/calidad (recomendado)",
        inputPerM: 3,
        outputPerM: 15,
        power: 4,
        performance:
          "Análisis matizado y redacción impecable; rendimiento premium constante en toda la plataforma.",
      },
      {
        id: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        note: "Rápido y económico",
        inputPerM: 1,
        outputPerM: 5,
        power: 3,
        performance:
          "Rápido y confiable; excelente relación velocidad-calidad para la operación completa de la plataforma.",
      },
    ],
    envVar: "ANTHROPIC_API_KEY",
  },
];
