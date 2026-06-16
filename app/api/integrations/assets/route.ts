import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const GET = withWorkspace(async (req: NextRequest, ctx: any) => {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "bot", "ad_account", "page"
  const provider = searchParams.get("provider");

  if (!type) {
    return apiError("Missing 'type' parameter", "BAD_REQUEST", 400);
  }

  const filters: any = {
    workspaceId: ctx.workspaceId,
    assetType: type,
  };

  if (provider) {
    filters.provider = provider;
  }

  try {
    const assets = await prisma.integrationAssetCache.findMany({
      where: filters,
      orderBy: { name: "asc" }
    });
    
    return apiSuccess({ assets });
  } catch (error) {
    return apiError("No se pudieron cargar los activos", "INTERNAL_ERROR", 500);
  }
});
