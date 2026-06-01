import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import crypto from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(
      workspaceId, session.user.id, ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const invites = await prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expires: { gt: new Date() },
      },
      orderBy: { expires: "asc" },
    });
    return NextResponse.json({ data: invites });
  } catch (err: any) {
    console.error("[INVITE] List error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { workspaceId } = await params;
    const hasAccess = await verifyWorkspaceAccess(
      workspaceId, session.user.id, ["OWNER", "ADMIN"]
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { email, role = "MEMBER" } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (!["ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido. Usa ADMIN o MEMBER" },
        { status: 400 }
      );
    }
    // Verificar si ya es miembro
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      });
      if (alreadyMember) {
        return NextResponse.json(
          { error: "Este usuario ya es miembro del workspace" },
          { status: 409 }
        );
      }
    }
    // Revocar invitaciones previas pendientes
    await prisma.workspaceInvite.deleteMany({
      where: {
        workspaceId,
        email,
        acceptedAt: null,
        expires: { gt: new Date() },
      },
    });
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.workspaceInvite.create({
      data: { workspaceId, email, token, role, expires },
      include: { workspace: { select: { name: true } } },
    });
    const baseUrl = process.env.NEXTAUTH_URL || "https://sodare.vercel.app";
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Enviar email de invitación via Resend
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const templateId = process.env.RESEND_TEMPLATE_WORKSPACE_INVITE;
        const fromEmail = process.env.RESEND_FROM_EMAIL || "SODARE <onboarding@resend.dev>";

        const emailPayload: Record<string, unknown> = {
          from: fromEmail,
          to: [email],
        };

        if (templateId) {
          emailPayload.template_id = templateId;
          emailPayload.template_data = {
            INVITER_NAME: session.user.name || "Un administrador",
            WORKSPACE_NAME: invite.workspace.name,
            ROLE: role,
            INVITE_URL: inviteUrl,
          };
        } else {
          emailPayload.subject = `Te invitaron a ${invite.workspace.name} — SODARE`;
          emailPayload.html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #030508; color: #e2e8f0; border-radius: 12px;">
              <h2 style="color: #00f0ff; margin: 0 0 16px;">⚡ SODARE</h2>
              <p><strong>${session.user.name || "Un administrador"}</strong> te ha invitado a unirte a <strong style="color:#00f0ff;">${invite.workspace.name}</strong> como <strong>${role}</strong>.</p>
              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #00f0ff, #0080ff); color: #030508; font-weight: bold; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Aceptar invitación →
              </a>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Esta invitación expira en 7 días.</p>
            </div>
          `;
        }

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log(`[INVITE] Email sent to ${email}`);
        } else {
          console.error("[INVITE] Email error:", await emailRes.text());
        }
      } catch (emailErr) {
        console.error("[INVITE] Email send error:", emailErr);
      }
    }

    console.log(`[INVITE] ${email} → ${inviteUrl} (emailSent: ${emailSent})`);
    return NextResponse.json({
      data: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires: invite.expires,
        inviteUrl: emailSent ? null : inviteUrl,
        emailSent,
        workspaceName: invite.workspace.name,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[INVITE] Create error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
