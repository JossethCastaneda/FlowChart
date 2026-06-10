import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

const ModuleAccessSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
});

const MemberPermissionsSchema = z.object({
  ops: ModuleAccessSchema,
  publisher: ModuleAccessSchema,
  inbox: ModuleAccessSchema,
  ads: ModuleAccessSchema,
  analytics: ModuleAccessSchema,
  briefing: ModuleAccessSchema,
});

const RequestSchema = z.object({
  userId: z.string().min(1, "Missing userId"),
  permissions: MemberPermissionsSchema.nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id, [
      "OWNER",
      "ADMIN",
    ]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await validateBody(req, RequestSchema);
    if (!result.ok) return result.response;
    
    const { userId, permissions } = result.data;

    const target = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    
    if (!target) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Actualizamos el JSON de permisos en la base de datos
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: {
        permissions: permissions ? (permissions as any) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[MEMBERS_PERMISSIONS] Patch error:", err);
    return NextResponse.json(
      { error: "Error al actualizar permisos" },
      { status: 500 }
    );
  }
}
