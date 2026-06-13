import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

const InviteSchema = z.object({
  email: z.string().email("Email inválido").max(255).transform((e) => e.toLowerCase().trim()),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

// GET /api/workspace/members — listar miembros + invitaciones pendientes
export async function GET() {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace activo" }, { status: 400 });
    }

    const [members, invites] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { role: "asc" },
      }),
      prisma.workspaceInvite.findMany({
        where: {
          workspaceId,
          acceptedAt: null,
          expires: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      data: {
        members: members.map((m) => ({
          id: m.user.id,
          name: m.user.name || m.user.email?.split("@")[0] || "Sin nombre",
          email: m.user.email,
          image: m.user.image,
          role: m.role,
          activityStatus: m.activityStatus || "disponible",
        })),
        invites: invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expires: i.expires,
          token: i.token,
        })),
      },
    });
  } catch (err: any) {
    console.error("[WORKSPACE MEMBERS] GET error:", err);
    return NextResponse.json({ error: "Error al obtener miembros" }, { status: 500 });
  }
}

// POST /api/workspace/members — enviar invitación
export async function POST(req: NextRequest) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace activo" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id, ["OWNER", "ADMIN"]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Solo OWNER/ADMIN pueden invitar" }, { status: 403 });
    }

    const result = await validateBody(req, InviteSchema);
    if (!result.ok) return result.response;
    const { email, role } = result.data;

    // Verificar si ya es miembro
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      });
      if (existingMember) {
        return NextResponse.json({ error: "Ya es miembro del workspace" }, { status: 409 });
      }
    }

    // Crear / renovar invitación
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    // Eliminar invitaciones previas no aceptadas para este email
    await prisma.workspaceInvite.deleteMany({
      where: { workspaceId, email, acceptedAt: null },
    });

    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        expires,
        invitedById: session.user.id,
      },
    });

    const { getBaseUrl } = await import("@/lib/get-base-url");
    const inviteUrl = `${getBaseUrl()}/invite/${token}`;

    // Enviar email si Resend está configurado
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      try {
        const templateId = process.env.RESEND_TEMPLATE_WORKSPACE_INVITE;
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        const payload: Record<string, unknown> = {
          from: fromEmail,
          to: [email],
        };

        if (templateId) {
          payload.template = {
            id: templateId,
            variables: {
              WORKSPACE_NAME: workspace?.name || "Sodare",
              INVITE_URL: inviteUrl,
              ROLE: role,
            },
          };
        } else {
          payload.subject = `Invitación a ${workspace?.name || "Sodare"}`;
          payload.html = `
            <p>Has sido invitado a unirte a <strong>${workspace?.name || "Sodare"}</strong> como <strong>${role}</strong>.</p>
            <p><a href="${inviteUrl}" style="background:#00d4ff;color:#000;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Aceptar invitación</a></p>
            <p style="color:#666;font-size:12px;">Este enlace expira en 7 días.</p>
          `;
        }

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (emailErr) {
        console.error("[WORKSPACE MEMBERS] Email send error:", emailErr);
      }
    }

    return NextResponse.json({
      data: { inviteUrl, token: invite.token, email, role },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[WORKSPACE MEMBERS] POST error:", err);
    return NextResponse.json({ error: "Error al enviar invitación" }, { status: 500 });
  }
}

// PATCH /api/workspace/members — cambiar rol de un miembro
export async function PATCH(req: NextRequest) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace activo" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id, ["OWNER", "ADMIN"]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Solo OWNER/ADMIN pueden cambiar roles" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json({ error: "userId y role válido requeridos" }, { status: 400 });
    }

    // No permitir degradar al propio OWNER si es el único
    if (userId === session.user.id) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });
    }

    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[WORKSPACE MEMBERS] PATCH error:", err);
    return NextResponse.json({ error: "Error al cambiar rol" }, { status: 500 });
  }
}

// DELETE /api/workspace/members — eliminar miembro o cancelar invitación
export async function DELETE(req: NextRequest) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "Sin workspace activo" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id, ["OWNER", "ADMIN"]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Solo OWNER/ADMIN pueden eliminar miembros" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const inviteToken = searchParams.get("inviteToken");

    if (inviteToken) {
      // Cancelar invitación pendiente
      await prisma.workspaceInvite.deleteMany({
        where: { workspaceId, token: inviteToken, acceptedAt: null },
      });
      return NextResponse.json({ success: true });
    }

    if (userId) {
      // No permitir eliminar al propio usuario
      if (userId === session.user.id) {
        return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
      }
      await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "userId o inviteToken requerido" }, { status: 400 });
  } catch (err: any) {
    console.error("[WORKSPACE MEMBERS] DELETE error:", err);
    return NextResponse.json({ error: "Error al eliminar miembro" }, { status: 500 });
  }
}
