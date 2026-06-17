import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

export async function GET() {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) return NextResponse.json({ data: [] });

    await verifyWorkspaceAccess(workspaceId, session.user.id);

    const objectives = await prisma.objective.findMany({
      where: { workspaceId },
      include: {
        keyResults: {
          include: {
            tasks: { select: { id: true, status: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: objectives });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    await verifyWorkspaceAccess(workspaceId, session.user.id);

    const body = await req.json();
    const { title, description, quarter, areaId, keyResults } = body;

    const objective = await prisma.objective.create({
      data: {
        workspaceId,
        title,
        description,
        quarter,
        areaId,
        keyResults: {
          create: keyResults?.map((kr: any) => ({
            title: kr.title,
            targetValue: Number(kr.targetValue) || 100,
            unit: kr.unit || "%"
          })) || []
        }
      },
      include: { keyResults: true }
    });

    return NextResponse.json({ data: objective });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
