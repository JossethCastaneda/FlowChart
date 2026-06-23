import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getBaseUrl } from "@/lib/get-base-url";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";

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
      logger.info("[FORGOT-PASSWORD] Email not found:", normalizedEmail);
      // Equalize response timing to prevent email enumeration via timing analysis
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      return NextResponse.json({ success: true });
    }

    // Generar token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Eliminar tokens previos para este email
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalizedEmail },
    });

    // Crear token
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: tokenHash,
        expires,
      },
    });

    // Construir URL de reset
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    // En desarrollo (sin RESEND_API_KEY), retornar el enlace directamente
    // para que los desarrolladores puedan testear sin configurar email.
    const isDev = process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY;
    if (isDev) {
      logger.info("[FORGOT-PASSWORD] Dev mode: returning reset URL directly (no email configured)");
      return NextResponse.json({ success: true, devResetUrl: resetUrl });
    }

    const { sendPasswordResetEmail } = await import("@/lib/email");
    await sendPasswordResetEmail({
      to: normalizedEmail,
      userName: user.name || "usuario",
      resetUrl,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("[FORGOT-PASSWORD] Error:", err);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}
