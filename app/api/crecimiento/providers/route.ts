/**
 * GET /api/crecimiento/providers — catálogo de IAs para el selector de Aria.
 *
 * Devuelve cada proveedor (Gemini/GPT/Claude) con sus puntos fuertes y modelos,
 * marcando cuáles tienen API key configurada en el servidor (sin exponer la key),
 * y cuál es la selección activa del workspace. La selección se guarda con el
 * endpoint existente PUT /api/workspace/ai-model { model }.
 */

import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiServerError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { AI_CATALOG, getProvider, getActiveProvider, resolveSelection } from "@/lib/ai";

export const dynamic = "force-dynamic";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (_req, ctx) => {
  try {
    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: ctx.workspaceId },
      select: { extConfig: true },
    });
    const extConfig = (settings?.extConfig as Record<string, unknown>) || {};
    const stored =
      typeof extConfig.ariaGenerativeModel === "string" && extConfig.ariaGenerativeModel.length > 0
        ? extConfig.ariaGenerativeModel
        : null;

    // IA efectiva. Si hay una selección explícita válida y con key, esa manda;
    // si no, el default del sistema (getActiveProvider = Gemini si tiene key).
    let activeProviderId: string | null = null;
    let activeModel: string | null = null;
    let explicit = false;
    if (stored) {
      const resolved = resolveSelection(stored);
      if (resolved && getProvider(resolved.provider).isConfigured()) {
        activeProviderId = resolved.provider;
        activeModel = resolved.model;
        explicit = true;
      }
    }
    if (!activeProviderId) {
      const active = getActiveProvider();
      if (active.isConfigured()) {
        activeProviderId = active.id;
        activeModel = active.defaultModel;
      }
    }

    const providers = AI_CATALOG.map((c) => ({
      ...c,
      configured: getProvider(c.id).isConfigured(),
    }));

    return apiSuccess({
      providers,
      selectedModel: stored,
      explicit,
      activeProviderId,
      activeModel,
      canManage: ctx.role === "OWNER" || ctx.role === "ADMIN",
    });
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/providers GET");
  }
});
