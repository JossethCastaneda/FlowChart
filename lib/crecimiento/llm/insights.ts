/**
 * Generación de insights de Aria: el LLM EXPLICA las métricas reales del motor
 * determinista y recomienda acciones. No computa ni inventa cifras.
 */

import { getWorkspaceAiProvider, AriaInsightsJsonSchema, AriaInsightsZod } from "@/lib/ai";
import type { AriaInsights } from "@/lib/ai";
import { buildAriaContext } from "./context";

const SYSTEM =
  "Eres Aria, IA predictiva para equipos comerciales. Explicas y recomiendas SOLO " +
  "sobre las cifras provistas en el contexto. NUNCA inventes métricas, AUC, porcentajes " +
  "ni cifras que no estén en el contexto; si faltan datos, dilo explícitamente. Responde " +
  "en español, en lenguaje de negocio, conciso y accionable.";

export async function generateAriaInsights(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<AriaInsights> {
  const context = await buildAriaContext(workspaceId);
  const { provider, model } = await getWorkspaceAiProvider(workspaceId);
  const result = await provider.completeStructured<AriaInsights>({
    model,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          `Contexto real de los modelos predictivos del workspace:\n${context}\n\n` +
          "Genera insights de negocio basados ÚNICAMENTE en estas cifras.",
      },
    ],
    schemaName: "aria_insights",
    jsonSchema: AriaInsightsJsonSchema,
    parse: (raw) => AriaInsightsZod.parse(raw),
    maxTokens: 1500,
    signal,
  });
  return result.data;
}
