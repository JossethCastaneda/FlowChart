import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Siempre devolver success (no revelar si el email existe)
    if (!user) {
      console.log("[FORGOT-PASSWORD] Email not found:", normalizedEmail);
      return NextResponse.json({ success: true });
    }

    // Generar token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Eliminar tokens previos para este email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Crear token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    });

    // Construir URL de reset
    const baseUrl = process.env.NEXTAUTH_URL || "https://sodare.vercel.app";
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    // Enviar email si Resend está configurado
    if (process.env.RESEND_API_KEY) {
      try {
        const templateId = process.env.RESEND_TEMPLATE_PASSWORD_RESET;
        const fromEmail = process.env.RESEND_FROM_EMAIL || "SODARE <onboarding@resend.dev>";

        const emailPayload: Record<string, unknown> = {
          from: fromEmail,
          to: [normalizedEmail],
        };

        if (templateId) {
          // Usar template de Resend
          emailPayload.template_id = templateId;
          emailPayload.template_data = {
            NAME: user.name || "usuario",
            RESET_URL: resetUrl,
          };
        } else {
          // Fallback: HTML inline
          emailPayload.subject = "Recuperar contraseña — SODARE";
          emailPayload.html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #030508; color: #e2e8f0; border-radius: 12px;">
              <h2 style="color: #00f0ff; margin: 0 0 16px;">⚡ SODARE</h2>
              <p>Hola ${user.name || "usuario"},</p>
              <p>Recibimos una solicitud para restablecer tu contraseña.</p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #00f0ff, #0080ff); color: #030508; font-weight: bold; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Restablecer contraseña →
              </a>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
                Este enlace expira en 1 hora.<br/>Si no solicitaste esto, ignora este email.
              </p>
            </div>
          `;
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        });
        if (!res.ok) {
          console.error("[FORGOT-PASSWORD] Resend error:", await res.text());
        }
      } catch (emailErr) {
        console.error("[FORGOT-PASSWORD] Email send error:", emailErr);
      }
    } else {
      // Sin Resend configurado — log the URL for debugging
      console.log("[FORGOT-PASSWORD] Reset URL (no email provider):", resetUrl);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[FORGOT-PASSWORD] Error:", err);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}
