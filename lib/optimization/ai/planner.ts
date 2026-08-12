import { z } from "zod";
import { routeAiRequest } from "@/lib/ai/router";
import type { OptimizationContext } from "./context-builder";
import { TelemetryTracker } from "@/lib/ai/orchestration/run";

export const OptimizationPlanSchema = z.object({
  actions: z.array(z.object({
    actionType: z.enum(["PAUSE_CAMPAIGN", "CHANGE_CAMPAIGN_STATUS"]),
    entity: z.object({
      type: z.literal("campaign"),
      id: z.string()
    }),
    proposedValue: z.any(),
    expectedImpact: z.string(),
    evidence: z.array(z.string()).min(1, "Debe incluir al menos una evidencia para la acción propuesta")
  })).max(5, "No se deben proponer más de 5 acciones por ciclo para mantener control")
});

export type OptimizationPlan = z.infer<typeof OptimizationPlanSchema>;

const PLANNER_PROMPT_VERSION = "optimization-planner:v1";

/**
 * AI Planner: Constructs an optimization plan based on context.
 * P1 Implementation: read-only analysis proposing deterministic, reversible actions.
 */
export async function generateOptimizationPlan(
  workspaceId: string,
  context: OptimizationContext
): Promise<OptimizationPlan> {
  // 1. Route to a model that supports structured output and reasoning
  const route = await routeAiRequest({
    requirements: {
      required: ["structured_output"],
      preferred: ["reasoning", "long_context"]
    },
    workspaceId,
    moduleKey: "optimization",
    taskId: "planner"
  });

  const provider = route.provider;

  // 2. Start telemetry run
  const run = await TelemetryTracker.createRun(
    workspaceId,
    "planner:propose_action",
    provider.id,
    route.modelId,
    PLANNER_PROMPT_VERSION
  );

  try {
    const prompt = `
Eres el Motor de Orquestación de IA de FlowChart.
Tu objetivo es analizar el contexto de optimización actual y proponer acciones de bajo riesgo y alta reversibilidad.
Acciones permitidas en esta fase: PAUSE_CAMPAIGN, CHANGE_CAMPAIGN_STATUS.

Contexto:
${JSON.stringify(context, null, 2)}

Genera un plan con las acciones sugeridas basándote estrictamente en las reglas de negocio (e.g. pausa campañas con CPA > Target). 
Asegúrate de justificar con evidencias numéricas.
    `;

    // 3. Execute Structured Call
    const result = await provider.completeStructured({
      model: route.providerModelId,
      messages: [{ role: "user", content: prompt }],
      system: "Actúa como un arquitecto de marketing altamente analítico y conservador.",
      schemaName: "OptimizationPlan",
      jsonSchema: {
        type: "object",
        properties: {
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                actionType: { type: "string", enum: ["PAUSE_CAMPAIGN", "CHANGE_CAMPAIGN_STATUS"] },
                entity: {
                  type: "object",
                  properties: {
                    type: { type: "string", const: "campaign" },
                    id: { type: "string" }
                  },
                  required: ["type", "id"]
                },
                proposedValue: { type: ["string", "boolean", "number", "null"] },
                expectedImpact: { type: "string" },
                evidence: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["actionType", "entity", "proposedValue", "expectedImpact", "evidence"]
            }
          }
        },
        required: ["actions"]
      },
      parse: (raw) => OptimizationPlanSchema.parse(raw)
    });

    await TelemetryTracker.completeRun(run, result.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 });

    return result.data;
  } catch (error) {
    await TelemetryTracker.failRun(run, error as Error);
    throw error;
  }
}
