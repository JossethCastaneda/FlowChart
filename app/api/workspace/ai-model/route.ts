import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { AI_CATALOG, DEFAULT_MODEL, getProvider } from "@/lib/ai";

const ModelSchema = z.object({ model: z.string().min(1).max(64) });

// Obtener el modelo IA configurado en el workspace
export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (req, ctx) => {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
  });
  
  if (!settings) {
    return apiSuccess({ model: DEFAULT_MODEL }); // Default si no hay settings
  }

  const extConfig = settings.extConfig as Record<string, any>;
  return apiSuccess({ model: extConfig?.ariaGenerativeModel || DEFAULT_MODEL });
});

// Actualizar el modelo IA del workspace
export const PUT = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const parsed = await validateBody(req, ModelSchema);
  if (!parsed.ok) return parsed.response;
  const { model } = parsed.data;

  // Validate that model exists in AI_CATALOG and its provider is configured
  let foundProvider = null;
  for (const p of AI_CATALOG) {
    if (p.models.some((m) => m.id === model)) {
      foundProvider = p;
      break;
    }
  }

  if (!foundProvider) {
    return apiSuccess({ error: "Modelo no encontrado en el catálogo" }, 400);
  }

  if (!getProvider(foundProvider.id).isConfigured()) {
    return apiSuccess({ error: `El proveedor ${foundProvider.label} no está configurado (Falta API Key)` }, 400);
  }

  // Obtener settings actuales para mezclar el extConfig
  let settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
  });

  const currentExtConfig = (settings?.extConfig as Record<string, any>) || {};
  const updatedExtConfig = { ...currentExtConfig, ariaGenerativeModel: model };

  settings = await prisma.workspaceSettings.upsert({
    where: { workspaceId: ctx.workspaceId },
    create: {
      workspaceId: ctx.workspaceId,
      extConfig: updatedExtConfig,
    },
    update: {
      extConfig: updatedExtConfig,
    },
  });

  return apiSuccess({ model: updatedExtConfig.ariaGenerativeModel });
});
