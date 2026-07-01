/**
 * Esquemas estructurados de Aria (fuente única de verdad) + traductores de dialecto.
 *
 * Se define el JSON Schema estándar UNA vez; los adapters lo convierten:
 *  - OpenAI   → json_schema strict (additionalProperties:false en cada objeto)
 *  - Gemini   → responseSchema (tipos en MAYÚSCULA, sin additionalProperties)
 *  - Anthropic→ output_config.format (JSON Schema estándar tal cual)
 * Un validador Zod parsea la respuesta para garantizar el tipo en runtime.
 */

import { z } from "zod";

type JsonObject = Record<string, unknown>;

/** Convierte JSON Schema estándar al dialecto de Gemini (OpenAPI 3 subset). */
export function toGeminiSchema(schema: JsonObject): JsonObject {
  const out: JsonObject = {};
  const type = schema.type;
  if (typeof type === "string") out.type = type.toUpperCase();
  if (typeof schema.description === "string") out.description = schema.description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (schema.properties && typeof schema.properties === "object") {
    const props: JsonObject = {};
    const order: string[] = [];
    for (const [k, v] of Object.entries(schema.properties as JsonObject)) {
      props[k] = toGeminiSchema(v as JsonObject);
      order.push(k);
    }
    out.properties = props;
    out.propertyOrdering = order;
    if (Array.isArray(schema.required)) out.required = schema.required;
  }
  if (schema.items && typeof schema.items === "object") {
    out.items = toGeminiSchema(schema.items as JsonObject);
  }
  return out;
}

/** Garantiza additionalProperties:false recursivamente (requisito de OpenAI strict). */
export function toOpenAISchema(schema: JsonObject): JsonObject {
  const out: JsonObject = { ...schema };
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.additionalProperties = false;
    const props: JsonObject = {};
    for (const [k, v] of Object.entries(out.properties as JsonObject)) {
      props[k] = toOpenAISchema(v as JsonObject);
    }
    out.properties = props;
    // OpenAI strict exige que todas las propiedades estén en required.
    out.required = Object.keys(out.properties as JsonObject);
  }
  if (out.type === "array" && out.items && typeof out.items === "object") {
    out.items = toOpenAISchema(out.items as JsonObject);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Esquema de Insights de Aria (el LLM EXPLICA métricas reales, no las inventa).
// ---------------------------------------------------------------------------

export const AriaInsightsZod = z.object({
  resumenEjecutivo: z.string(),
  topVariables: z.array(z.object({ variable: z.string(), explicacion: z.string() })),
  recomendaciones: z.array(z.string()),
  siguienteAccion: z.string(),
});
export type AriaInsights = z.infer<typeof AriaInsightsZod>;

export const AriaInsightsJsonSchema: JsonObject = {
  type: "object",
  properties: {
    resumenEjecutivo: { type: "string", description: "Resumen ejecutivo de los resultados del modelo en 2-3 frases." },
    topVariables: {
      type: "array",
      description: "Variables más influyentes según la importancia ya calculada.",
      items: {
        type: "object",
        properties: {
          variable: { type: "string" },
          explicacion: { type: "string", description: "Por qué influye, en lenguaje de negocio." },
        },
        required: ["variable", "explicacion"],
      },
    },
    recomendaciones: { type: "array", items: { type: "string" }, description: "Acciones comerciales priorizadas." },
    siguienteAccion: { type: "string", description: "La única siguiente mejor acción recomendada." },
  },
  required: ["resumenEjecutivo", "topVariables", "recomendaciones", "siguienteAccion"],
};
