import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getBaseUrl } from "@/lib/get-base-url";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

import { z } from "zod";
import { validateBody } from "@/lib/validate";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").max(255).transform((e) => e.toLowerCase().trim()),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 attempts per 15 minutes per IP
    const ip = getClientIP(req);
    const { ok } = rateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000);
    if (!ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta en 15 minutos." },
        { status: 429 }
      );
    }

    const result = await validateBody(req, ForgotPasswordSchema);
    if (!result.ok) return result.response;
    const { email: normalizedEmail } = result.data;

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
    const baseUrl = getBaseUrl();
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
          // Resend API requires "template" object, NOT "template_id"
          emailPayload.template = {
            id: templateId,
            variables: {
              NAME: user.name || "usuario",
              RESET_URL: resetUrl,
            },
          };
        } else {
          // Fallback: HTML inline
          emailPayload.subject = "Recuperar contraseña — SODARE";
          emailPayload.html = (await import("@/lib/email-templates")).getPasswordResetEmailHtml({
            userName: user.name || "usuario",
            resetUrl,
          });
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
