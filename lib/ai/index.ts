/**
 * Punto de entrada de la capa LLM multi-proveedor de Sodare/Aria.
 * Uso típico (server-side):
 *   import { getActiveProvider } from "@/lib/ai";
 *   const { text } = await getActiveProvider().complete({ system, messages });
 */

export * from "./types";
export * from "./registry";
export * from "./catalog";
export { normalizeUpstreamError } from "./errors";
export {
  AriaInsightsZod,
  AriaInsightsJsonSchema,
  toGeminiSchema,
  toOpenAISchema,
} from "./schema";
export type { AriaInsights } from "./schema";
