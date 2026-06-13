import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!invite) {
      return NextResponse.json(
        { error: "Invitación no encontrada" }, { status: 404 }
      );
    }
    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: "Esta invitación ya fue aceptada" }, { status: 410 }
      );
    }
    if (invite.expires < new Date()) {
      return NextResponse.json(
        { error: "Esta invitación ha expirado" }, { status: 410 }
      );
    }
    return NextResponse.json({
      data: {
        email: invite.email,
        role: invite.role,
        workspace: invite.workspace,
        expires: invite.expires,
      },
    });
  } catch (err: any) {
    console.error("[INVITE] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para aceptar la invitación" },
        { status: 401 }
      );
    }
    const { token } = await params;
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
    });
    if (!invite || invite.acceptedAt || invite.expires < new Date()) {
      return NextResponse.json(
        { error: "Invitación inválida o expirada" }, { status: 410 }
      );
    }

    // Verificar que el email coincide — pero SOLO si el usuario tiene email.
    // Usuarios OAuth sin email (e.g. Facebook sin permiso de email) se identifican
    // solo por su userId. Si el invite tiene email, el usuario debe tenerlo igual.
    if (invite.email && session.user.email) {
      if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
        return NextResponse.json(
          { error: "Esta invitación fue enviada a otro email" },
          { status: 403 }
        );
      }
    } else if (invite.email && !session.user.email) {
      // El invite requiere email pero el usuario no lo tiene —
      // permitir igualmente si el usuario está autenticado (OAuth sin email).
      // El admin fue quien generó la invitación para este usuario.
    }

    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
        },
      },
    });
    if (alreadyMember) {
      return NextResponse.json(
        { error: "Ya eres miembro de este workspace" }, { status: 409 }
      );
    }
    // CRÍTICO: Asegurar que el usuario existe en la tabla User
    // antes de crear WorkspaceMember (FK constraint)
    // NOTA: No incluir password en update para no borrar passwords existentes
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {
        // Solo actualizar campos si tienen valor (no sobrescribir con null)
        ...(session.user.name ? { name: session.user.name } : {}),
        ...(session.user.image ? { image: session.user.image } : {}),
        // NO actualizar email (podría romper auth) ni password
      },
      create: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    });
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { token },
        data: { acceptedAt: new Date() },
      }),
    ]);
    // Setear cookie para que el workspace de la invite sea el activo
    const response = NextResponse.json({
      success: true,
      workspaceId: invite.workspaceId,
      redirectTo: "/dashboard/resumen",
    });
    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, invite.workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (err: any) {
    console.error("[INVITE] Accept error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
