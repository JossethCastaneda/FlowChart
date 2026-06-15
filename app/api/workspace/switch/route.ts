import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

const RequestSchema = z.object({ workspaceId: z.string().min(1, "Workspace ID required") });

export async function POST(req: NextRequest) {
    try {
          const result = await validateBody(req, RequestSchema);
          if (!result.ok) return result.response;
          const { workspaceId } = result.data;
          
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }




    // Verificar que el usuario pertenece a ese workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No tienes acceso a este workspace" },
        { status: 403 }
      );
    }

    // Setear cookie httpOnly con el nuevo workspace activo
    const response = NextResponse.json({
      success: true,
      workspace: membership.workspace,
    });

    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 año
      path: "/",
      domain: process.env.NODE_ENV === "production" ? ".sodare.xyz" : undefined,
    });

    return response;
    } catch (err: any) {
    console.error("[WORKSPACE SWITCH] Error:", err);
    return NextResponse.json(
      { error: "Error al cambiar workspace" },
      { status: 500 }
    );
    }
}
