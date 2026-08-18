/**
 * app/api/chat/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Endpoint de chat con streaming — Vercel AI SDK v7 + Gemini 1.5 Flash.
 *
 * Variable de entorno requerida:
 *   GEMINI_API_KEY=tu_api_key_de_google_ai_studio
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { withWorkspace } from "@/lib/api-handler";
import { apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { getWorkspaceAiProvider } from "@/lib/ai/registry";
import { AI_CATALOG } from "@/lib/ai/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = withWorkspace(async (req, ctx) => {
  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages ?? [];
  } catch {
    return apiError("Cuerpo de solicitud inválido", "BAD_REQUEST", 400);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return apiError("El campo 'messages' es requerido y no puede estar vacío.", "VALIDATION_ERROR", 422);
  }

  const { provider, model } = await getWorkspaceAiProvider(ctx.workspaceId);
  const providerDef = AI_CATALOG.find((p) => p.id === provider.id);
  const modelDef = providerDef?.models.find((m) => m.id === model);

  if (!providerDef || !modelDef) {
    return apiError("Modelo configurado no válido", "INVALID_MODEL", 500);
  }

  // Identificador de proveedor mapeado para Vercel AI Gateway
  // Gemini -> google, OpenAI -> openai, Anthropic -> anthropic
  const gatewayProviderId = provider.id === "gemini" ? "google" : provider.id;
  
  // Format para AI Gateway: "google/gemini-1.5-flash-latest"
  const gatewayModelId = `${gatewayProviderId}/${modelDef.providerModelId}`;

  // Determinamos el API Key a usar: BYOK o Gateway Global
  // 1. Si existe AI_GATEWAY_API_KEY, Vercel gestiona las llaves en Dashboard.
  // 2. BYOK: pasamos la llave directamente como apiKey (al conectarse a Vercel AI Gateway, 
  //    la enviará pero tal vez necesitemos pasarla en un header si usamos BYOK explícito.
  //    Sin embargo, el Vercel AI Gateway documentation dice que podemos mandar la llave nativa 
  //    en los headers de Authorization o pasarlo como api_key en el cliente si es compatible.)
  const gatewayApiKey = env.AI_GATEWAY_API_KEY;
  let nativeApiKey = "";

  if (!gatewayApiKey) {
    if (provider.id === "gemini") nativeApiKey = env.GEMINI_API_KEY ?? "";
    else if (provider.id === "openai") nativeApiKey = env.OPENAI_API_KEY ?? "";
    else if (provider.id === "anthropic") nativeApiKey = env.ANTHROPIC_API_KEY ?? "";

    if (!nativeApiKey) {
       return apiError(`No hay API Key configurada para ${providerDef.label}.`, "NO_AI_KEY", 503);
    }
  }

  // Create Gateway Client
  const gatewayClient = createOpenAI({
    baseURL: "https://ai-gateway.vercel.sh/v1",
    // Si usamos Dashboard, mandamos AI_GATEWAY_API_KEY
    // Si usamos BYOK, enviamos la key nativa para que Gateway la use
    apiKey: gatewayApiKey || nativeApiKey, 
  });

  const lastUserMessage = messages.findLast((m) => m.role === "user");
  if (lastUserMessage) {
    logger.info("[/api/chat] Mensaje entrante", { userId: ctx.userId, workspaceId: ctx.workspaceId, model: gatewayModelId });
  }

  // Convertir UIMessage[] → formato del modelo
  const modelMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(""),
  }));

  try {
    const result = streamText({
      model: gatewayClient(gatewayModelId),
      system:
        "Eres Aria, el asistente de inteligencia de FlowChart. " +
        "Responde siempre en el idioma del usuario. " +
        "Sé conciso, directo y útil.",
      messages: modelMessages,
      maxOutputTokens: 2048,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.fullStream }),
    });
  } catch (error) {
    logger.error("[/api/chat] Error en streamText", { error });
    return apiError("Fallo al contactar el AI Gateway", "GATEWAY_ERROR", 502);
  }
});
