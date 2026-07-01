import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiServerError } from "@/lib/api-response";
import { generateAriaInsights } from "@/lib/crecimiento/llm/insights";
import { normalizeUpstreamError, hasAnyProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow 60s for LLM to reply

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (req, ctx) => {
  if (!hasAnyProvider()) {
    return apiServerError(new Error("AI provider no configurado"), "/api/crecimiento/insights GET");
  }
  
  try {
    const signal = req.signal; // Usa el request signal si está disponible (next.js app router no lo expone directo a veces, pero para abortar)
    const insights = await generateAriaInsights(ctx.workspaceId);
    return apiSuccess(insights);
  } catch (error) {
    return normalizeUpstreamError(error);
  }
});
