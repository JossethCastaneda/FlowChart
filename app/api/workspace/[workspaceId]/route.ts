import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { role: "asc" },
        },
        _count: { select: { projects: true, invites: true } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({ data: workspace });
  } catch (err: any) {
    console.error("[WORKSPACE GET] Error:", err);
    return NextResponse.json(
      { error: "Error al obtener workspace" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
          const result = await validateBody(req, RequestSchema);
          if (!result.ok) return result.response;
          const { name } = result.data;
          
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(
      workspaceId,
      session.user.id,
      ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }




    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ data: updated });
    } catch (err: any) {
    console.error("[WORKSPACE PATCH] Error:", err);
    return NextResponse.json(
      { error: "Error al actualizar workspace" },
      { status: 500 }
    );
    }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(
      workspaceId,
      session.user.id,
      ["OWNER"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Solo el OWNER puede eliminar el workspace" }, { status: 403 });
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[WORKSPACE DELETE] Error:", err);
    return NextResponse.json(
      { error: "Error al eliminar workspace" },
      { status: 500 }
    );
  }
}

let RequestSchema = z.object({ name: z.string().min(1, "Name required") });
