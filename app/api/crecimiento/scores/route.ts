import { withWorkspaceRole } from "@/lib/api-handler";
import { apiSuccess, apiServerError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (_req, ctx) => {
  try {
    const predictions = await prisma.ariaPrediction.findMany({
      where: { model: { dataset: { workspaceId: ctx.workspaceId } } },
      include: {
        model: {
          select: {
            name: true,
            algorithm: true,
            dataset: {
              select: {
                targetType: true,
                clientName: true,
                verticalName: true,
                project: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { score: "desc" },
      take: 200,
    });
    return apiSuccess(predictions);
  } catch (error) {
    return apiServerError(error, "/api/crecimiento/scores GET");
  }
});
