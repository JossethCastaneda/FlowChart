/**
 * POST /api/agents/orchestrate — plan de acción del workspace vía agentes.
 *
 * Ejecuta los subagentes de módulo (Crecimiento, Proyectos, Ops, Publisher,
 * Inbox) EN PARALELO sobre datos reales del workspace y sintetiza un plan
 * priorizado con el orquestador. Todo corre con la IA contratada en el
 * catálogo (getWorkspaceAiProvider) — la selección del usuario potencia
 * todos los módulos.
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { rateLimit, getClientIP } from "@/lib/ratelimit";
import { getWorkspaceAiProvider, hasAnyProvider, normalizeUpstreamError } from "@/lib/ai";
import { orchestrate } from "@/lib/ai/agents/core";
import { buildModuleTasks, synthesisAgent, synthesisInput } from "@/lib/ai/agents/sodare-agents";
import { logger } from "@/lib/logger";
import { checkAiLimit, recordAiUsage } from "@/lib/ai/metering";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withWorkspace(async (req, ctx) => {
  // Orquestar dispara 6 llamadas LLM: límite bajo por usuario.
  const ip = getClientIP(req);
  const rl = rateLimit(`agents-orchestrate:${ctx.userId}:${ip}`, 3, 60_000);
  if (!rl.ok) return apiError("Demasiadas solicitudes. Espera un momento.", "RATE_LIMITED", 429);

  if (!hasAnyProvider()) {
    return apiError("IA no configurada en el servidor.", "SERVER_CONFIG", 503);
  }

  const aiLimit = await checkAiLimit(ctx.workspaceId);
  if (!aiLimit.allowed) {
    return apiError(aiLimit.message, "PLAN_LIMIT", 402);
  }

  try {
    const { provider, model } = await getWorkspaceAiProvider(ctx.workspaceId);
    const tasks = await buildModuleTasks(ctx.workspaceId);
    const { final, outcomes } = await orchestrate(
      { provider, model },
      tasks,
      synthesisAgent,
      synthesisInput,
    );

    logger.info("[AGENTS] Plan orquestado", {
      workspaceId: ctx.workspaceId,
      provider: final.provider,
      model: final.model,
      subagentes: outcomes.map((o) => ({ agente: o.agentKey, ok: o.ok })),
    });

    // Record usage for synthesis agent
    if (final.usage) {
      await recordAiUsage(ctx.workspaceId, "/api/agents/orchestrate", final.model, final.usage.promptTokens, final.usage.completionTokens);
    }
    
    // Record usage for subagents
    for (const outcome of outcomes) {
      if (outcome.ok && outcome.usage) {
        await recordAiUsage(ctx.workspaceId, `/api/agents/orchestrate/${outcome.agentKey}`, final.model, outcome.usage.promptTokens, outcome.usage.completionTokens);
      }
    }

    return apiSuccess({
      plan: final.data,
      agentes: outcomes.map((o) => ({
        key: o.agentKey,
        nombre: o.agentName,
        ok: o.ok,
        hallazgos: o.ok ? o.data : null,
      })),
      provider: final.provider,
      model: final.model,
    });
  } catch (err) {
    return normalizeUpstreamError(err);
  }
});
