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
import { AI_CATALOG, getProvider, resolveSelection } from "@/lib/ai";

export const dynamic = "force-dynamic";

const DEFAULT_SELECTION = "gpt-4.1-mini";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (_req, ctx) => {
  try {
    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: ctx.workspaceId },
      select: { extConfig: true },
    });
    const extConfig = (settings?.extConfig as Record<string, unknown>) || {};
    const selected =
      typeof extConfig.ariaGenerativeModel === "string"
        ? extConfig.ariaGenerativeModel
        : DEFAULT_SELECTION;

    const resolved = resolveSelection(selected);
    // Proveedor/modelo efectivo (lo que realmente respondería, considerando keys).
    const activeProviderId =
      resolved && getProvider(resolved.provider).isConfigured() ? resolved.provider : null;

    const providers = AI_CATALOG.map((c) => ({
      ...c,
      configured: getProvider(c.id).isConfigured(),
    }));

    return apiSuccess({
      providers,
      selectedModel: selected,
      activeProviderId,
      activeModel: activeProviderId && resolved ? resolved.model : null,
    });
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/providers GET");
  }
});
