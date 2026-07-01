import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import { z } from "zod";
import prisma from "@/lib/prisma";

const ModelSchema = z.object({ model: z.string().min(1).max(64) });

// Obtener el modelo IA configurado en el workspace
export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (req, ctx) => {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
  });
  
  if (!settings) {
    return apiSuccess({ model: "gpt-4.1-mini" }); // Default si no hay settings
  }

  const extConfig = settings.extConfig as Record<string, any>;
  return apiSuccess({ model: extConfig?.ariaGenerativeModel || "gpt-4.1-mini" });
});

// Actualizar el modelo IA del workspace
export const PUT = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const parsed = await validateBody(req, ModelSchema);
  if (!parsed.ok) return parsed.response;
  const { model } = parsed.data;

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
