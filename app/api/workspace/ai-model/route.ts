import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AI_CATALOG } from "@/lib/ai/catalog";
import { getProvider } from "@/lib/ai/registry";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (_req, ctx) => {
  const { workspaceId } = ctx;

  const ws = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
    select: { extConfig: true },
  });
  
  const ext = typeof ws?.extConfig === "object" && ws?.extConfig !== null 
    ? (ws.extConfig as Record<string, unknown>) 
    : {};
    
  const currentModel = (ext.ariaGenerativeModel as string) || "gemini-1.5-flash";

  const pricings = await prisma.aiModelPricing.findMany({
    where: {
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
    }
  });

  const priceMap = new Map();
  for (const p of pricings) {
    priceMap.set(p.providerModelId, p);
  }

  const providers = AI_CATALOG.map(p => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providerImpl = getProvider(p.id as any);
    return {
      ...p,
      configured: providerImpl.isConfigured(),
      models: p.models.map(m => {
        const pricing = priceMap.get(m.providerModelId);
        return {
          id: m.id,
          label: m.label,
          note: m.note,
          power: m.power,
          performance: m.performance,
          inputPerM: pricing ? Number(pricing.inputPrice) * 1000000 : 0,
          outputPerM: pricing ? Number(pricing.outputPrice) * 1000000 : 0,
        };
      })
    };
  });

  return apiSuccess({
    model: currentModel,
    defaultModel: "gemini-1.5-flash",
    providers
  });
});

const PutSchema = z.object({
  model: z.string()
});

export const PUT = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => {
  const { workspaceId } = ctx;
  const result = await validateBody(req, PutSchema);
  if (!result.ok) return result.response;
  const { model } = result.data;

  let providerId = null;
  for (const p of AI_CATALOG) {
    if (p.models.some(m => m.id === model)) {
      providerId = p.id;
      break;
    }
  }

  if (!providerId) {
    return apiError("Modelo no encontrado en el catálogo", "INVALID_MODEL", 400);
  }

  const ws = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
    select: { extConfig: true },
  });

  const ext = typeof ws?.extConfig === "object" && ws?.extConfig !== null 
    ? (ws.extConfig as Record<string, unknown>) 
    : {};
    
  const newExt = {
    ...ext,
    ariaProvider: providerId,
    ariaGenerativeModel: model,
    providerMode: "LOCKED"
  };

  await prisma.workspaceSettings.upsert({
    where: { workspaceId },
    update: { extConfig: newExt },
    create: { workspaceId, extConfig: newExt },
  });

  return apiSuccess({ success: true, model });
});
