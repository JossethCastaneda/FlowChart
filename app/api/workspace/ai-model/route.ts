import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

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
  const body = await req.json();
  const { model } = body;

  if (!model || typeof model !== "string") {
    return apiError("model es requerido y debe ser string", "BAD_REQUEST", 400);
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
