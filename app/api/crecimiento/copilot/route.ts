/**
 * POST /api/crecimiento/copilot — Aria Copilot (asistente conversacional).
 *
 * Proxy server-side multi-proveedor (GPT/Gemini/Claude). La API key NUNCA llega al
 * cliente. El LLM explica/recomienda SOLO sobre el contexto real del workspace
 * (métricas computadas por el motor determinista); no inventa cifras.
 */

import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { rateLimit, getClientIP } from "@/lib/ratelimit";
import { z } from "zod";
import { getWorkspaceAiProvider, hasAnyProvider, normalizeUpstreamError } from "@/lib/ai";
import type { LLMMessage } from "@/lib/ai";
import { buildAriaContext } from "@/lib/crecimiento/llm/context";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

const SYSTEM =
  "Eres Aria, copiloto de IA predictiva para equipos comerciales. Respondes en español, " +
  "conciso y accionable. Usa ÚNICAMENTE las cifras del contexto provisto; NUNCA inventes " +
  "métricas, AUC, scores ni porcentajes. Si la información no está en el contexto, dilo. " +
  "Cuando un modelo sea 'baseline', aclara que no está entrenado y carece de AUC.";

export const POST = withWorkspace(async (req, ctx) => {
  const ip = getClientIP(req);
  const rl = rateLimit(`aria-copilot:${ctx.userId}:${ip}`, 15, 60_000);
  if (!rl.ok) return apiError("Demasiadas solicitudes. Espera un momento.", "RATE_LIMITED", 429);

  if (!hasAnyProvider()) {
    return apiError("IA no configurada en el servidor.", "SERVER_CONFIG", 503);
  }

  const parsed = await validateBody(req, BodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const context = await buildAriaContext(ctx.workspaceId);
    const messages: LLMMessage[] = [...(parsed.data.history ?? []), { role: "user", content: parsed.data.message }];
    const { provider, model } = await getWorkspaceAiProvider(ctx.workspaceId);
    const result = await provider.complete({
      model,
      system: `${SYSTEM}\n\nContexto real (no inventar nada fuera de esto):\n${context}`,
      messages,
      maxTokens: 1024,
    });
    return apiSuccess({ reply: result.text, provider: result.provider, model: result.model });
  } catch (err) {
    return normalizeUpstreamError(err);
  }
});
