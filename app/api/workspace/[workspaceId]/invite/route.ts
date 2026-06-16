import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import crypto from "crypto";
import { getBaseUrl } from "@/lib/get-base-url";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

const RequestSchema = z.object({ email: z.string().email("Email inválido"), role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER") });

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
          const result = await validateBody(req, RequestSchema);
          if (!result.ok) return result.response;
          const { email, role } = result.data;
          
    const session = await safeGetSession();
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
    const baseUrl = getBaseUrl();
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Enviar email de invitación via Resend
    let emailSent = false;
    const { sendInviteEmail } = await import("@/lib/email");
    const resultEmail = await sendInviteEmail({
      to: email,
      inviterName: session.user.name || "Un administrador",
      workspaceName: invite.workspace.name,
      role,
      inviteUrl,
    });
    
    if (resultEmail) {
      emailSent = true;
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
