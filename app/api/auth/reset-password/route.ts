import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";

const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = getClientIP(req);
    const { ok } = await rateLimit(`reset:${ip}`, 5, 15 * 60 * 1000);
    if (!ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta en 15 minutos." },
        { status: 429 }
      );
    }

    const validationResult = await validateBody(req, ResetPasswordSchema);
    if (!validationResult.ok) return validationResult.response;
    const { token, password } = validationResult.data;
    
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Wrap in transaction to prevent race conditions (two requests using same token)
    const result = await prisma.$transaction(async (tx) => {
      const verification = await tx.verificationToken.findUnique({
        where: { token: tokenHash },
      });

      if (!verification) {
        return { error: "Token inválido o expirado", status: 400 };
      }

      if (verification.expires < new Date()) {
        await tx.verificationToken.delete({ where: { token: tokenHash } });
        return { error: "El enlace ha expirado. Solicita uno nuevo.", status: 410 };
      }

      const user = await tx.user.findUnique({
        where: { email: verification.identifier },
      });

      if (!user) {
        return { error: "Usuario no encontrado", status: 404 };
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await tx.user.update({
        where: { id: user.id },
        // passwordChangedAt invalida las sesiones JWT emitidas antes de este momento.
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      });

      await tx.verificationToken.delete({ where: { token: tokenHash } });

      logger.info("[RESET-PASSWORD] Password updated for:", user.email);
      return { success: true };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("[RESET-PASSWORD] Error:", err);
    return NextResponse.json(
      { error: "Error al restablecer contraseña" },
      { status: 500 }
    );
  }
}
