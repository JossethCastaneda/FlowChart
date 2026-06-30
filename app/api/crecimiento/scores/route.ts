import { NextResponse } from "next/server";
import { withWorkspaceRole } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

export const GET = withWorkspaceRole(["OWNER", "ADMIN", "MEMBER"])(async (req, ctx) => {
  try {
    const predictions = await prisma.ariaPrediction.findMany({
      where: {
        model: {
          dataset: {
            workspaceId: ctx.workspaceId
          }
        }
      },
      include: {
        model: {
          select: { name: true }
        }
      },
      orderBy: { score: "desc" },
      take: 100
    });

    return NextResponse.json(predictions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
