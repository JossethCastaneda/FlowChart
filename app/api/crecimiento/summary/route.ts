import { NextResponse } from "next/server";
import { withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (req, ctx) => {
  try {
    const modelsCount = await prisma.ariaModel.count({
      where: {
        dataset: { workspaceId: ctx.workspaceId }
      }
    });

    const totalLeadsAnalizados = await prisma.ariaPrediction.count({
      where: {
        model: { dataset: { workspaceId: ctx.workspaceId } }
      }
    });

    const highIntentLeads = await prisma.ariaPrediction.count({
      where: {
        model: { dataset: { workspaceId: ctx.workspaceId } },
        priority: "High"
      }
    });

    return NextResponse.json({
      modelsCount,
      totalLeadsAnalizados,
      highIntentLeads,
      lift: modelsCount > 0 ? "2.4x" : "0x" // simulated predictive lift
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
